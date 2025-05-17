"use client";

import React, { useState, useEffect } from 'react';
import { OzonCredentials, getProductList, getProductInfo, getProductStock, getProductPrices, getCategories, ProductFilter } from '@/lib/ozonApi';
import { supabase } from '@/lib/supabase';

interface ProductExportPageProps {
  userId: string;
  credentials: OzonCredentials;
}

interface Product {
  product_id: string;
  offer_id: string;
  name: string;
  category: string;
  price: number;
  old_price?: number;
  stock: number;
  sku: string;
  image_url?: string;
  status: string;
}

const ProductExportPage: React.FC<ProductExportPageProps> = ({ userId, credentials }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<string>('all'); // all, in-stock, out-of-stock
  const [sortBy, setSortBy] = useState<string>('name'); // name, price, stock
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const productsPerPage = 20;

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [userId, credentials]);

  // Применение фильтров при их изменении
  useEffect(() => {
    applyFilters();
  }, [products, selectedCategory, searchTerm, stockFilter, sortBy, sortOrder]);

  // Загрузка категорий
  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await getCategories(credentials);
      
      if (error) {
        throw new Error('Ошибка при загрузке категорий: ' + error);
      }
      
      if (data && data.result) {
        setCategories(data.result);
      }
    } catch (error) {
      setMessage((error as Error).message);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка товаров
  const loadProducts = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      // Получение списка товаров
      const filter: ProductFilter = {};
      if (selectedCategory) {
        filter.category_id = parseInt(selectedCategory);
      }
      if (searchTerm) {
        filter.search = searchTerm;
      }
      
      const { data: productListData, error: productListError } = await getProductList(
        credentials,
        filter,
        1000, // Увеличиваем лимит для получения большего количества товаров
        0
      );
      
      if (productListError) {
        throw new Error('Ошибка при загрузке списка товаров: ' + productListError);
      }
      
      if (!productListData || !productListData.result || !productListData.result.items) {
        setProducts([]);
        setMessage('Товары не найдены');
        setMessageType('warning');
        return;
      }
      
      const productIds = productListData.result.items.map((item: any) => item.product_id);
      
      if (productIds.length === 0) {
        setProducts([]);
        setMessage('Товары не найдены');
        setMessageType('warning');
        return;
      }
      
      // Получение информации о товарах
      const { data: productInfoData, error: productInfoError } = await getProductInfo(
        credentials,
        productIds
      );
      
      if (productInfoError) {
        throw new Error('Ошибка при загрузке информации о товарах: ' + productInfoError);
      }
      
      // Получение информации об остатках
      const { data: stockData, error: stockError } = await getProductStock(
        credentials,
        productIds
      );
      
      if (stockError) {
        throw new Error('Ошибка при загрузке информации об остатках: ' + stockError);
      }
      
      // Получение информации о ценах
      const { data: priceData, error: priceError } = await getProductPrices(
        credentials,
        productIds
      );
      
      if (priceError) {
        throw new Error('Ошибка при загрузке информации о ценах: ' + priceError);
      }
      
      // Объединение данных
      const productsData: Product[] = [];
      
      if (productInfoData && productInfoData.result && productInfoData.result.items) {
        productInfoData.result.items.forEach((item: any) => {
          const stockInfo = stockData?.result?.items?.find((s: any) => s.product_id === item.product_id);
          const priceInfo = priceData?.result?.items?.find((p: any) => p.product_id === item.product_id);
          
          productsData.push({
            product_id: item.product_id,
            offer_id: item.offer_id || '',
            name: item.name || 'Без названия',
            category: item.category || 'Без категории',
            price: priceInfo?.price?.price || 0,
            old_price: priceInfo?.price?.old_price,
            stock: stockInfo?.stocks?.reduce((sum: number, s: any) => sum + s.present, 0) || 0,
            sku: item.sku || '',
            image_url: item.images?.[0] || '',
            status: item.status || 'inactive'
          });
        });
      }
      
      setProducts(productsData);
      
      if (productsData.length === 0) {
        setMessage('Товары не найдены');
        setMessageType('warning');
      } else {
        setMessage(`Загружено ${productsData.length} товаров`);
        setMessageType('success');
      }
    } catch (error) {
      setMessage((error as Error).message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Применение фильтров
  const applyFilters = () => {
    let filtered = [...products];
    
    // Фильтрация по категории
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    
    // Фильтрация по поисковому запросу
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(term) || 
        product.sku.toLowerCase().includes(term) ||
        product.offer_id.toLowerCase().includes(term)
      );
    }
    
    // Фильтрация по наличию
    if (stockFilter === 'in-stock') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (stockFilter === 'out-of-stock') {
      filtered = filtered.filter(product => product.stock === 0);
    }
    
    // Сортировка
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else if (sortBy === 'price') {
        return sortOrder === 'asc' 
          ? a.price - b.price 
          : b.price - a.price;
      } else if (sortBy === 'stock') {
        return sortOrder === 'asc' 
          ? a.stock - b.stock 
          : b.stock - a.stock;
      }
      return 0;
    });
    
    setFilteredProducts(filtered);
    setTotalPages(Math.ceil(filtered.length / productsPerPage));
    setCurrentPage(1); // Сброс на первую страницу при изменении фильтров
  };

  // Получение товаров для текущей страницы
  const getCurrentPageProducts = () => {
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    return filteredProducts.slice(startIndex, endIndex);
  };

  // Обработка выбора товара
  const handleProductSelect = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // Обработка выбора всех товаров на странице
  const handleSelectAllOnPage = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    
    const newSelected = new Set(selectedProducts);
    const currentPageProducts = getCurrentPageProducts();
    
    if (newSelectAll) {
      currentPageProducts.forEach(product => {
        newSelected.add(product.product_id);
      });
    } else {
      currentPageProducts.forEach(product => {
        newSelected.delete(product.product_id);
      });
    }
    
    setSelectedProducts(newSelected);
  };

  // Сохранение выбранных товаров в базу данных
  const saveSelectedProducts = async () => {
    if (selectedProducts.size === 0) {
      setMessage('Не выбрано ни одного товара');
      setMessageType('warning');
      return;
    }
    
    try {
      setLoading(true);
      
      const selectedProductsData = products.filter(product => 
        selectedProducts.has(product.product_id)
      );
      
      // Сохранение в базу данных
      const { error } = await supabase
        .from('exported_products')
        .upsert(
          selectedProductsData.map(product => ({
            user_id: userId,
            product_id: product.product_id,
            offer_id: product.offer_id,
            name: product.name,
            category: product.category,
            price: product.price,
            old_price: product.old_price || null,
            stock: product.stock,
            sku: product.sku,
            image_url: product.image_url || null,
            status: product.status,
            exported_at: new Date().toISOString()
          }))
        );
      
      if (error) {
        throw new Error('Ошибка при сохранении товаров: ' + error.message);
      }
      
      setMessage(`Успешно сохранено ${selectedProducts.size} товаров`);
      setMessageType('success');
    } catch (error) {
      setMessage((error as Error).message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Форматирование цены
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Выгрузка товаров</h1>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${
          messageType === 'error' ? 'bg-red-100 text-red-700' : 
          messageType === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
          'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Фильтры и поиск</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2">Категория</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Все категории</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.title}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Поиск по названию/SKU</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Введите название или SKU"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Наличие</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">Все товары</option>
              <option value="in-stock">В наличии</option>
              <option value="out-of-stock">Нет в наличии</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2">Сортировка</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name">По названию</option>
              <option value="price">По цене</option>
              <option value="stock">По остатку</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Порядок</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <option value="asc">По возрастанию</option>
              <option value="desc">По убыванию</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-between">
          <button
            onClick={loadProducts}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            disabled={loading}
          >
            {loading ? 'Загрузка...' : 'Обновить товары'}
          </button>
          
          <button
            onClick={saveSelectedProducts}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
            disabled={loading || selectedProducts.size === 0}
          >
            {loading ? 'Сохранение...' : `Сохранить выбранные (${selectedProducts.size})`}
          </button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Список товаров</h2>
          <div className="text-gray-600">
            Всего: {filteredProducts.length} товаров
          </div>
        </div>
        
        {filteredProducts.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAllOnPage}
                      />
                    </th>
                    <th className="py-2 px-3 text-left">Фото</th>
                    <th className="py-2 px-3 text-left">Название</th>
                    <th className="py-2 px-3 text-left">SKU</th>
                    <th className="py-2 px-3 text-left">Категория</th>
                    <th className="py-2 px-3 text-right">Цена</th>
                    <th className="py-2 px-3 text-right">Остаток</th>
                    <th className="py-2 px-3 text-center">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {getCurrentPageProducts().map((product) => (
                    <tr key={product.product_id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.product_id)}
                          onChange={() => handleProductSelect(product.product_id)}
                        />
                      </td>
                      <td className="py-2 px-3">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">Нет фото</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3">{product.name}</td>
                      <td className="py-2 px-3">{product.sku}</td>
                      <td className="py-2 px-3">{product.category}</td>
                      <td className="py-2 px-3 text-right">
                        {formatPrice(product.price)}
                        {product.old_price && (
                          <div className="text-gray-400 line-through text-xs">
                            {formatPrice(product.old_price)}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          product.status === 'active' ? 'bg-green-100 text-green-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status === 'active' ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="flex items-center">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-l border bg-white disabled:opacity-50"
                  >
                    &laquo;
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 border-t border-b ${
                        currentPage === page 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-r border bg-white disabled:opacity-50"
                  >
                    &raquo;
                  </button>
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {loading ? (
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              'Нет товаров для отображения'
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductExportPage;
