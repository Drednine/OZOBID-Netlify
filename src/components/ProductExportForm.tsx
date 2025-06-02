"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios'; // Для запросов к нашему API

// Интерфейс для учетных данных, передаваемых в пропсах
interface OzonCredentials {
  storeName?: string;
  sellerClientId?: string;
  sellerApiKey?: string;
  performanceClientId?: string;
  performanceApiKey?: string;
}

interface ProductExportFormProps {
  userId: string;
  credentials: OzonCredentials | null; // Может быть null, если магазин не выбран
}

// Интерфейс для товара, как он приходит от нашего API /api/ozon/products
// Должен совпадать с AggregatedProduct из src/app/api/ozon/products/route.ts
interface Product {
  product_id: number;
  offer_id: string;
  name: string;
  images: string[];
  price: number;
  old_price: number;
  totalStock: number; 
  category_id: number; 
  barcode?: string;
  description?: string;
  stocks_by_type?: { fbo: number; fbs: number; crossborder: number };
}

interface FormValues {
  searchQuery: string;
  exportType: 'all' | 'inStock' | 'outOfStock';
  priceFilter: 'all' | 'withPrice' | 'withoutPrice';
}

const ITEMS_PER_PAGE = 20; // Количество товаров на странице

const ProductExportForm: React.FC<ProductExportFormProps> = ({ userId, credentials }) => {
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  const [exportProgress, setExportProgress] = useState(0);
  
  const [totalItems, setTotalItems] = useState(0); 
  const [currentLastId, setCurrentLastId] = useState<string>(""); 
  const [pageHistory, setPageHistory] = useState<string[]>([""]); 
  const [currentPageNumber, setCurrentPageNumber] = useState(1);

  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      searchQuery: '',
      exportType: 'all',
      priceFilter: 'all'
    }
  });

  const exportType = watch('exportType');
  const priceFilter = watch('priceFilter');
  const searchQuery = watch('searchQuery');

  const fetchProducts = useCallback(async (lastIdToFetch: string, currentSearchTerm?: string) => {
    if (!credentials || !credentials.sellerClientId || !credentials.sellerApiKey) {
      setProducts([]);
      setFilteredProducts([]);
      setTotalItems(0);
      setProductError('Учетные данные Ozon Seller API отсутствуют или неполны.');
      return;
    }

    setLoadingProducts(true);
    setProductError(null);

    try {
      const response = await axios.post('/api/ozon/products', {
        clientId: credentials.sellerClientId,
        apiKey: credentials.sellerApiKey,
        storeName: credentials.storeName,
        pageSize: ITEMS_PER_PAGE,
        lastId: lastIdToFetch,
        searchTerm: currentSearchTerm,
      });

      if (response.data && Array.isArray(response.data.items)) {
        setProducts(response.data.items);
        setFilteredProducts(response.data.items); 
        setTotalItems(response.data.total_items || 0);
        setCurrentLastId(response.data.last_id || "");
        
        if (!lastIdToFetch || currentSearchTerm) { 
            setPageHistory([""]); 
            setCurrentPageNumber(1);
        }
        console.log('ProductExportForm: Products loaded:', response.data.items.length, 'Total:', response.data.total_items, 'NextLastId:', response.data.last_id, 'SearchTerm:', currentSearchTerm);
      } else {
        throw new Error('Некорректный формат ответа от API товаров');
      }
    } catch (err: any) {
      console.error("ProductExportForm: Error fetching products:", err);
      const errorDetails = err.response?.data?.details || err.message || 'Неизвестная ошибка загрузки товаров';
      setProductError(`Ошибка загрузки товаров: ${errorDetails}`);
      setProducts([]);
      setFilteredProducts([]);
      setTotalItems(0);
    } finally {
      setLoadingProducts(false);
    }
  }, [credentials]);

  useEffect(() => {
    if (credentials && credentials.sellerClientId && credentials.sellerApiKey) {
      console.log('ProductExportForm: Credentials changed or initial load, fetching initial products...', credentials.storeName);
      fetchProducts("", searchQuery); 
    } else {
      setProducts([]);
      setFilteredProducts([]);
      setTotalItems(0);
      setCurrentLastId("");
      setPageHistory([""]);
      setCurrentPageNumber(1);
      setProductError(null); 
      console.log('ProductExportForm: Credentials cleared or incomplete.');
    }
  }, [credentials, fetchProducts, searchQuery]);

  useEffect(() => {
    if (products.length === 0 && !loadingProducts) { 
        setFilteredProducts([]);
        return;
    }
    
    let filtered = [...products];
    
    if (exportType === 'inStock') {
      filtered = filtered.filter(product => product.totalStock > 0);
    } else if (exportType === 'outOfStock') {
      filtered = filtered.filter(product => product.totalStock <= 0);
    }
    
    if (priceFilter === 'withPrice') {
      filtered = filtered.filter(product => product.price > 0);
    } else if (priceFilter === 'withoutPrice') {
      filtered = filtered.filter(product => product.price <= 0);
    }
        
    setFilteredProducts(filtered);
  }, [exportType, priceFilter, products, loadingProducts]);

  const handleNextPage = () => {
    if (currentLastId) {
      setPageHistory(prev => [...prev, currentLastId]);
      fetchProducts(currentLastId, searchQuery);
      setCurrentPageNumber(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageHistory.length > 1) { 
      const newHistory = [...pageHistory];
      newHistory.pop(); 
      const prevLastId = newHistory[newHistory.length - 1]; 
      setPageHistory(newHistory);
      fetchProducts(prevLastId, searchQuery);
      setCurrentPageNumber(prev => prev - 1);
    }
  };

  const onSubmit = (data: FormValues) => {
    if (filteredProducts.length === 0) {
      setProductError('Нет товаров для экспорта по заданным фильтрам.');
      return;
    }
    setExporting(true);
    setProductError(null);
    setExportProgress(0);

    const csvHeader = "Product ID,Offer ID (SKU),Name,Category ID,Price,Old Price,Total Stock,FBO Stock,FBS Stock,Crossborder Stock,Image URL,Product URL,Description,Barcode\n";
    let csvContent = csvHeader;

    filteredProducts.forEach((product, index) => {
        const productViewUrl = `https://www.ozon.ru/product/${product.product_id}`;
        const row = [
            product.product_id,
            product.offer_id,
            `"${product.name.replace(/"/g, '""')}"`,
            product.category_id,
            product.price,
            product.old_price,
            product.totalStock,
            product.stocks_by_type?.fbo || 0,
            product.stocks_by_type?.fbs || 0,
            product.stocks_by_type?.crossborder || 0,
            product.images.length > 0 ? product.images[0] : 'N/A',
            productViewUrl,
            `"${(product.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
            product.barcode || 'N/A'
        ].join(',');
        csvContent += row + '\n';
        setExportProgress(Math.round(((index + 1) / filteredProducts.length) * 100));
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const storeNameForFile = credentials?.storeName?.replace(/[^a-z0-9]/gi, '_') || 'export';
    link.setAttribute('download', `ozon_products_${storeNameForFile}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExporting(false);
    alert('Экспорт товаров в CSV завершен!');
  };

  if (!credentials) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Пожалуйста, выберите или добавьте магазин на вкладке "Магазины", чтобы просмотреть товары.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Раздел фильтров */} 
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-md bg-gray-50">
        <div>
          <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700">Поиск по названию или артикулу</label>
          <input {...register('searchQuery')} type="text" id="searchQuery" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2" placeholder="Введите текст..." />
        </div>
        
        <div>
          <label htmlFor="exportType" className="block text-sm font-medium text-gray-700">Фильтр по наличию</label>
          <select {...register('exportType')} id="exportType" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white">
            <option value="all">Все товары</option>
            <option value="inStock">Только в наличии</option>
            <option value="outOfStock">Только отсутствующие</option>
          </select>
        </div>

        <div>
          <label htmlFor="priceFilter" className="block text-sm font-medium text-gray-700">Фильтр по цене</label>
          <select {...register('priceFilter')} id="priceFilter" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white">
            <option value="all">Все товары</option>
            <option value="withPrice">С ценой</option>
            <option value="withoutPrice">Без цены</option>
          </select>
        </div>
      </div>

      {/* Сообщение о загрузке/ошибке */} 
      {loadingProducts && <p className="text-center text-blue-600 py-4">Загрузка товаров...</p>}
      {productError && <p className="text-center text-red-600 py-4">{productError}</p>}
      
      {/* Информация о найденных товарах и кнопка экспорта */} 
      {!loadingProducts && !productError && products.length > 0 && (
        <div className="flex justify-between items-center mt-4 mb-2 px-1">
          <p className="text-sm text-gray-700">
            Показано: {filteredProducts.length} из {totalItems} (Страница: {currentPageNumber} из ~{Math.ceil(totalItems / ITEMS_PER_PAGE)})
          </p>
          <button 
            type="submit" 
            disabled={exporting || loadingProducts || filteredProducts.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {exporting ? `Экспорт... ${exportProgress}%` : 'Экспортировать в CSV'}
          </button>
        </div>
      )}

      {/* Таблица товаров */} 
      <div className="overflow-x-auto mt-2">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Изобр.</th>
              <th className="p-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
              <th className="p-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Артикул (SKU)</th>
              <th className="p-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
              <th className="p-2 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Остаток</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!loadingProducts && filteredProducts.map((product) => (
              <tr key={product.product_id}>
                <td className="p-2 border-b align-top">
                  {product.images && product.images.length > 0 && (
                    <img src={product.images[0]} alt={product.name} className="w-12 h-12 object-cover rounded" />
                  )}
                </td>
                <td className="p-2 border-b align-top">
                  <a 
                    href={`https://www.ozon.ru/product/${product.product_id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    {product.name}
                  </a>
                  <div className="text-xs text-gray-500 mt-1">ID: {product.product_id}</div>
                </td>
                <td className="p-2 border-b align-top text-sm text-gray-700">{product.offer_id}</td>
                <td className="p-2 border-b align-top text-sm text-gray-700">
                  {product.price > 0 ? `${product.price.toLocaleString('ru-RU')} ₽` : '-'}
                  {product.old_price > 0 && product.old_price > product.price && (
                    <span className="block text-xs text-gray-500 line-through mt-1">{product.old_price.toLocaleString('ru-RU')} ₽</span>
                  )}
                </td>
                <td className="p-2 border-b align-top text-sm text-gray-700">
                  <div>Общий: {product.totalStock}</div>
                  {product.stocks_by_type && (
                    <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                      {typeof product.stocks_by_type.fbo === 'number' && product.stocks_by_type.fbo > 0 && <div>FBO: {product.stocks_by_type.fbo}</div>}
                      {typeof product.stocks_by_type.fbs === 'number' && product.stocks_by_type.fbs > 0 && <div>FBS: {product.stocks_by_type.fbs}</div>}
                      {typeof product.stocks_by_type.crossborder === 'number' && product.stocks_by_type.crossborder > 0 && <div>Crossborder: {product.stocks_by_type.crossborder}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!loadingProducts && filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  {productError ? 'Ошибка загрузки данных.' : (products.length > 0 && searchQuery) ? 'Товары не найдены по заданным фильтрам.' : 'Товары не загружены или отсутствуют в магазине.' }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */} 
      {!loadingProducts && !productError && totalItems > 0 && (
         <div className="mt-6 flex justify-between items-center px-1">
          <button 
            onClick={handlePrevPage} 
            disabled={pageHistory.length <= 1 || loadingProducts}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Назад
          </button>
          <span className="text-sm text-gray-700">
            Страница {currentPageNumber} из ~{Math.ceil(totalItems / ITEMS_PER_PAGE)}
          </span>
          <button 
            onClick={handleNextPage} 
            disabled={!currentLastId || loadingProducts || (products.length < ITEMS_PER_PAGE && currentLastId === "") || (products.length === 0 && currentLastId !== "")}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперед
          </button>
        </div>
      )}
    </form>
  );
};

export default ProductExportForm;
