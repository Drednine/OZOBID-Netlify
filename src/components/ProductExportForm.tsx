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
interface Product {
  id: number;
  name: string;
  sku: string;
  category: string; // ID категории
  price: number;
  oldPrice: number;
  stock: number;
  status?: string;
  images: string[]; 
  url: string;
  description?: string;
  barcode?: string;
}

interface FormValues {
  // category: string; // Пока уберем фильтр по категориям для упрощения
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
  
  // const [categories, setCategories] = useState<{id: string, name: string}[]>([]); // Пока убрано
  const [exportProgress, setExportProgress] = useState(0);
  
  const [totalItems, setTotalItems] = useState(0); // Общее количество товаров от API
  const [currentLastId, setCurrentLastId] = useState<string>(""); // last_id для следующего запроса
  const [pageHistory, setPageHistory] = useState<string[]>([""]); // История last_id для кнопки "Назад"
  const [currentPageNumber, setCurrentPageNumber] = useState(1);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      // category: 'all',
      searchQuery: '',
      exportType: 'all',
      priceFilter: 'all'
    }
  });

  const exportType = watch('exportType');
  const priceFilter = watch('priceFilter');
  // const categoryFilter = watch('category'); // Пока убрано
  const searchQuery = watch('searchQuery');

  const fetchProducts = useCallback(async (lastIdToFetch: string) => {
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
      });

      if (response.data && Array.isArray(response.data.items)) {
        setProducts(response.data.items);
        setFilteredProducts(response.data.items); // Изначально показываем все загруженные
        setTotalItems(response.data.total_items || 0);
        setCurrentLastId(response.data.last_id || "");
        
        if (!lastIdToFetch) { // Если это первая страница (lastId пустой)
            setPageHistory([""]); // Сбрасываем историю для нового набора (например, при смене магазина)
            setCurrentPageNumber(1);
        }
        console.log('ProductExportForm: Products loaded:', response.data.items.length, 'Total:', response.data.total_items, 'NextLastId:', response.data.last_id);
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

  // Загрузка товаров при изменении credentials (выбор магазина)
  useEffect(() => {
    if (credentials && credentials.sellerClientId && credentials.sellerApiKey) {
      console.log('ProductExportForm: Credentials changed, fetching initial products...', credentials.storeName);
      fetchProducts(""); // Загружаем первую страницу
    } else {
      setProducts([]);
      setFilteredProducts([]);
      setTotalItems(0);
      setCurrentLastId("");
      setPageHistory([""]);
      setCurrentPageNumber(1);
      setProductError(null); // Очищаем ошибку, если учетные данные убраны
      console.log('ProductExportForm: Credentials cleared or incomplete.');
    }
  }, [credentials, fetchProducts]);

  // Фильтрация товаров при изменении фильтров или основного списка товаров
  useEffect(() => {
    if (products.length === 0 && !loadingProducts) { // Если нечего фильтровать и не идет загрузка
        setFilteredProducts([]);
        return;
    }
    
    let filtered = [...products];
    
    if (exportType === 'inStock') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (exportType === 'outOfStock') {
      filtered = filtered.filter(product => product.stock <= 0);
    }
    
    if (priceFilter === 'withPrice') {
      filtered = filtered.filter(product => product.price > 0);
    } else if (priceFilter === 'withoutPrice') {
      filtered = filtered.filter(product => product.price <= 0);
    }
        
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.sku.toLowerCase().includes(query)
      );
    }
    
    setFilteredProducts(filtered);
  }, [exportType, priceFilter, searchQuery, products, loadingProducts]);

  const handleNextPage = () => {
    if (currentLastId) {
      setPageHistory(prev => [...prev, currentLastId]);
      fetchProducts(currentLastId);
      setCurrentPageNumber(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageHistory.length > 1) { // Есть куда возвращаться (не первая страница)
      const newHistory = [...pageHistory];
      newHistory.pop(); // Удаляем текущий lastId (который привел нас сюда)
      const prevLastId = newHistory[newHistory.length - 1]; // Берем предыдущий lastId
      setPageHistory(newHistory);
      fetchProducts(prevLastId);
      setCurrentPageNumber(prev => prev - 1);
    }
  };

  const onSubmit = (data: FormValues) => {
    // Логика экспорта в CSV
    if (filteredProducts.length === 0) {
      setProductError('Нет товаров для экспорта по заданным фильтрам.');
      return;
    }
    setExporting(true);
    setProductError(null);
    setExportProgress(0);

    // Имитация прогресса и экспорт
    // ... (код экспорта оставим пока без изменений, он будет работать с filteredProducts)
    const csvHeader = "ID,SKU,Name,Category,Price,Old Price,Stock,Image URL,Product URL,Description,Barcode\n";
    let csvContent = csvHeader;

    filteredProducts.forEach((product, index) => {
        const row = [
            product.id,
            product.sku,
            `"${product.name.replace(/"/g, '""')}"`,
            `"${product.category.replace(/"/g, '""')}"`,
            product.price,
            product.oldPrice,
            product.stock,
            product.images.length > 0 ? product.images[0] : 'N/A',
            product.url,
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
    // setMessage('Экспорт завершен!'); // Используем setProductError или отдельное состояние для успеха
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-md bg-gray-50">
        <div>
          <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700">Поиск по названию или артикулу</label>
          <input {...register('searchQuery')} type="text" id="searchQuery" className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2" placeholder="Введите текст..." />
        </div>
        
        {/* Категории пока убраны 
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Категория</label>
          <select {...register('category')} id="category" className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white">
            <option value="all">Все категории</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>
        */}

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
      {loadingProducts && <p className="text-blue-600">Загрузка товаров...</p>}
      {productError && <p className="text-red-600">{productError}</p>}
      
      {/* Информация о найденных товарах и кнопка экспорта */} 
      {!loadingProducts && !productError && (
        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-700">
            Найдено товаров (на текущей странице): {filteredProducts.length} (Всего в магазине: {totalItems})
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Изобр.</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Артикул (SKU)</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Цена</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Остаток</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {!loadingProducts && filteredProducts.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {product.images && product.images.length > 0 ? (
                    <img src={product.images[0]} alt={product.name} className="h-10 w-10 object-cover rounded" />
                  ) : (
                    <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-gray-400">?</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 hover:text-blue-600">
                    <a href={product.url} target="_blank" rel="noopener noreferrer" title={product.description || product.name}>
                      {product.name}
                    </a>
                  </div>
                  <div className="text-xs text-gray-500">ID: {product.id}</div>
                  {product.barcode && <div className="text-xs text-gray-500">Штрихкод: {product.barcode}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.price > 0 ? `${product.price.toFixed(2)} ₽` : '-'}
                    {product.oldPrice > 0 && product.oldPrice > product.price && 
                        <span className="ml-2 text-xs text-gray-400 line-through">{product.oldPrice.toFixed(2)} ₽</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock}</td>
              </tr>
            ))}
            {!loadingProducts && filteredProducts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  {products.length > 0 ? 'Товары не найдены по заданным фильтрам.' : 'Товары не загружены или отсутствуют в магазине.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */} 
      {!loadingProducts && !productError && products.length > 0 && (
        <div className="mt-6 flex justify-between items-center">
          <button 
            onClick={handlePrevPage} 
            disabled={pageHistory.length <= 1 || loadingProducts}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Назад
          </button>
          <span className="text-sm text-gray-700">
            Страница {currentPageNumber}
            {totalItems > 0 && ` (Товаров в магазине: ${totalItems})`}
          </span>
          <button 
            onClick={handleNextPage} 
            disabled={!currentLastId || loadingProducts || products.length < ITEMS_PER_PAGE}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Вперед
          </button>
        </div>
      )}

    </form>
  );
};

export default ProductExportForm;
