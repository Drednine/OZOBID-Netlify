"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { 
  OzonCredentials, 
  getProductList, 
  getProductInfo, 
  getProductStock, 
  getProductPrices 
} from '@/lib/ozonApi';

interface ProductExportFormProps {
  userId: string;
  credentials: OzonCredentials;
}

interface FormValues {
  category: string;
  searchQuery: string;
  exportType: 'all' | 'inStock' | 'outOfStock';
  priceFilter: 'all' | 'withPrice' | 'withoutPrice';
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  oldPrice: number;
  stock: number;
  status: string;
  images: string[];
  url: string;
}

const ProductExportForm: React.FC<ProductExportFormProps> = ({ userId, credentials }) => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      category: 'all',
      searchQuery: '',
      exportType: 'all',
      priceFilter: 'all'
    }
  });

  const exportType = watch('exportType');
  const priceFilter = watch('priceFilter');
  const categoryFilter = watch('category');
  const searchQuery = watch('searchQuery');

  // Загрузка списка товаров при монтировании компонента
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setMessage('Загрузка списка товаров...');

      try {
        // Получение списка товаров
        const { data, error } = await getProductList(credentials);
        
        if (error) {
          throw new Error(error.message || 'Ошибка получения списка товаров');
        }
        
        if (!data || !data.items || !Array.isArray(data.items)) {
          throw new Error('Некорректный формат данных от API');
        }
        
        setTotalProducts(data.items.length);
        
        // Получение детальной информации о товарах
        const productIds = data.items.map(item => item.product_id);
        const batchSize = 100;
        const productDetails = [];
        const uniqueCategories = new Set();
        
        for (let i = 0; i < productIds.length; i += batchSize) {
          setExportProgress(Math.floor((i / productIds.length) * 100));
          
          const batchIds = productIds.slice(i, i + batchSize);
          
          // Получение информации о товарах
          const { data: infoData } = await getProductInfo(credentials, batchIds);
          
          // Получение информации о ценах
          const { data: priceData } = await getProductPrices(credentials, batchIds);
          
          // Получение информации об остатках
          const { data: stockData } = await getProductStock(credentials, batchIds);
          
          if (infoData && infoData.items) {
            infoData.items.forEach((item) => {
              const priceInfo = priceData?.items?.find((p) => p.product_id === item.product_id);
              const stockInfo = stockData?.items?.find((s) => s.product_id === item.product_id);
              
              if (item.category) {
                uniqueCategories.add(item.category);
              }
              
              productDetails.push({
                id: item.product_id,
                name: item.name || 'Без названия',
                sku: item.offer_id || '',
                category: item.category || 'Без категории',
                price: priceInfo?.price?.price || 0,
                oldPrice: priceInfo?.price?.old_price || 0,
                stock: stockInfo?.stocks?.reduce((sum, s) => sum + (s.present || 0), 0) || 0,
                status: item.status || 'inactive',
                images: item.images || [],
                url: 'https://ozon.ru/product/' + item.product_id
              });
            });
          }
        }
        
        setProducts(productDetails);
        setFilteredProducts(productDetails);
        
        // Формирование списка категорий
        const categoriesArray = Array.from(uniqueCategories).map(category => ({
          id: category,
          name: category
        }));
        
        setCategories(categoriesArray);
        setMessage('Загружено ' + productDetails.length + ' товаров');
        
      } catch (error) {
        setMessage('Ошибка загрузки товаров: ' + error.message);
      } finally {
        setLoading(false);
        setExportProgress(100);
      }
    };

    if (credentials.clientId && credentials.apiKey) {
      loadProducts();
    }
  }, [credentials]);

  // Фильтрация товаров при изменении фильтров
  useEffect(() => {
    if (products.length === 0) return;
    
    let filtered = [...products];
    
    // Фильтр по наличию
    if (exportType === 'inStock') {
      filtered = filtered.filter(product => product.stock > 0);
    } else if (exportType === 'outOfStock') {
      filtered = filtered.filter(product => product.stock <= 0);
    }
    
    // Фильтр по цене
    if (priceFilter === 'withPrice') {
      filtered = filtered.filter(product => product.price > 0);
    } else if (priceFilter === 'withoutPrice') {
      filtered = filtered.filter(product => product.price <= 0);
    }
    
    // Фильтр по категории
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }
    
    // Фильтр по поисковому запросу
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        product.sku.toLowerCase().includes(query)
      );
    }
    
    setFilteredProducts(filtered);
  }, [exportType, priceFilter, categoryFilter, searchQuery, products]);

  // Экспорт товаров в CSV
  const exportToCSV = () => {
    setExporting(true);
    
    try {
      // Формирование заголовков CSV
      const headers = [
        'ID', 'Название', 'Артикул', 'Категория', 
        'Цена', 'Старая цена', 'Остаток', 'Статус', 'URL'
      ].join(',');
      
      // Формирование строк CSV
      const rows = filteredProducts.map(product => [
        product.id,
        '"' + product.name.replace(/"/g, '""') + '"', // Экранирование кавычек
        product.sku,
        '"' + product.category.replace(/"/g, '""') + '"',
        product.price,
        product.oldPrice,
        product.stock,
        product.status,
        product.url
      ].join(','));
      
      // Объединение заголовков и строк
      const csv = [headers, ...rows].join('\n');
      
      // Создание Blob и ссылки для скачивания
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'ozon-products-' + new Date().toISOString().split('T')[0] + '.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage('Экспортировано ' + filteredProducts.length + ' товаров');
    } catch (error) {
      setMessage('Ошибка экспорта: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className='max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md'>
      <h2 className='text-2xl font-bold mb-6'>Выгрузка товаров</h2>

      {message && (
        <div className='p-4 mb-4 rounded bg-blue-100 text-blue-700'>
          {message}
        </div>
      )}

      {loading && (
        <div className='mb-6'>
          <div className='w-full bg-gray-200 rounded-full h-2.5 mb-2'>
            <div 
              className='bg-blue-600 h-2.5 rounded-full' 
              style={{ width: exportProgress + '%' }}
            ></div>
          </div>
          <p className='text-sm text-gray-500 text-center'>
            Загрузка товаров: {exportProgress}%
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(exportToCSV)} className='mb-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
          <div>
            <label htmlFor='category' className='block text-sm font-medium text-gray-700 mb-1'>
              Категория
            </label>
            <select
              id='category'
              className='w-full px-3 py-2 border border-gray-300 rounded-md'
              {...register('category')}
            >
              <option value='all'>Все категории</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor='searchQuery' className='block text-sm font-medium text-gray-700 mb-1'>
              Поиск по названию или артикулу
            </label>
            <input
              id='searchQuery'
              type='text'
              className='w-full px-3 py-2 border border-gray-300 rounded-md'
              placeholder='Введите текст для поиска'
              {...register('searchQuery')}
            />
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Фильтр по наличию
            </label>
            <div className='space-y-2'>
              <div className='flex items-center'>
                <input
                  id='all'
                  type='radio'
                  value='all'
                  className='h-4 w-4 text-blue-600'
                  {...register('exportType')}
                />
                <label htmlFor='all' className='ml-2 text-sm text-gray-700'>
                  Все товары
                </label>
              </div>
              <div className='flex items-center'>
                <input
                  id='inStock'
                  type='radio'
                  value='inStock'
                  className='h-4 w-4 text-blue-600'
                  {...register('exportType')}
                />
                <label htmlFor='inStock' className='ml-2 text-sm text-gray-700'>
                  Только в наличии
                </label>
              </div>
              <div className='flex items-center'>
                <input
                  id='outOfStock'
                  type='radio'
                  value='outOfStock'
                  className='h-4 w-4 text-blue-600'
                  {...register('exportType')}
                />
                <label htmlFor='outOfStock' className='ml-2 text-sm text-gray-700'>
                  Только отсутствующие
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Фильтр по цене
            </label>
            <div className='space-y-2'>
              <div className='flex items-center'>
                <input
                  id='allPrices'
                  type='radio'
                  value='all'
                  className='h-4 w-4 text-blue-600'
                  {...register('priceFilter')}
                />
                <label htmlFor='allPrices' className='ml-2 text-sm text-gray-700'>
                  Все товары
                </label>
              </div>
              <div className='flex items-center'>
                <input
                  id='withPrice'
                  type='radio'
                  value='withPrice'
                  className='h-4 w-4 text-blue-600'
                  {...register('priceFilter')}
                />
                <label htmlFor='withPrice' className='ml-2 text-sm text-gray-700'>
                  С ценой
                </label>
              </div>
              <div className='flex items-center'>
                <input
                  id='withoutPrice'
                  type='radio'
                  value='withoutPrice'
                  className='h-4 w-4 text-blue-600'
                  {...register('priceFilter')}
                />
                <label htmlFor='withoutPrice' className='ml-2 text-sm text-gray-700'>
                  Без цены
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center justify-between'>
          <div className='text-sm text-gray-500'>
            Найдено товаров: {filteredProducts.length} из {products.length}
          </div>
          <button
            type='submit'
            className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-200'
            disabled={loading || exporting || filteredProducts.length === 0}
          >
            {exporting ? 'Экспорт...' : 'Экспортировать в CSV'}
          </button>
        </div>
      </form>

      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Название
              </th>
              <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Артикул
              </th>
              <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Цена
              </th>
              <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Остаток
              </th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            {filteredProducts.slice(0, 10).map((product) => (
              <tr key={product.id}>
                <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                  {product.name}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                  {product.sku}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                  {product.price > 0 ? product.price + ' ₽' : '-'}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                  {product.stock}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length > 10 && (
          <div className='py-3 text-center text-sm text-gray-500'>
            Показаны первые 10 из {filteredProducts.length} товаров
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductExportForm;
