"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { OzonCredentials } from '@/lib/ozonApi';
import axios from 'axios';

interface ProductExportFormProps {
  userId: string;
  credentials: OzonCredentials;
}

interface FormValues {
  storeId: string;
  exportType: 'all' | 'selected';
  categoryId?: string;
}

const ProductExportForm: React.FC<ProductExportFormProps> = ({ userId, credentials }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();
  const exportType = watch('exportType');
  
  // Загрузка списка магазинов пользователя
  useEffect(() => {
    const loadStores = async () => {
      setLoading(true);
      
      try {
        // В реальном приложении здесь будет запрос к API для получения магазинов пользователя
        // Для демонстрации используем моковые данные
        setTimeout(() => {
          setStores([
            { id: 'store1', name: 'Основной магазин' },
            { id: 'store2', name: 'Второй магазин' }
          ]);
          setLoading(false);
        }, 500);
      } catch (error) {
        setMessage('Ошибка при загрузке магазинов: ' + error.message);
        setLoading(false);
      }
    };
    
    loadStores();
  }, [userId]);
  
  // Загрузка категорий при выборе магазина
  const handleStoreSelect = async (storeId: string) => {
    setSelectedStore(storeId);
    setLoading(true);
    
    try {
      // В реальном приложении здесь будет запрос к API для получения категорий магазина
      // Для демонстрации используем моковые данные
      setTimeout(() => {
        setCategories([
          { id: 'cat1', name: 'Электроника' },
          { id: 'cat2', name: 'Одежда' },
          { id: 'cat3', name: 'Товары для дома' }
        ]);
        setLoading(false);
      }, 500);
    } catch (error) {
      setMessage('Ошибка при загрузке категорий: ' + error.message);
      setLoading(false);
    }
  };
  
  // Обработчик отправки формы
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage('');
    setExportProgress(0);
    
    try {
      // Имитация процесса экспорта с прогрессом
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 10;
        });
      }, 500);
      
      // В реальном приложении здесь будет запрос к API Озон для экспорта товаров
      // Для демонстрации используем таймаут
      setTimeout(() => {
        clearInterval(progressInterval);
        setExportProgress(100);
        setMessage('Товары успешно выгружены');
        setLoading(false);
      }, 5000);
    } catch (error) {
      setMessage('Ошибка при выгрузке товаров: ' + error.message);
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Выгрузка товаров</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.includes('Ошибка') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Выберите магазин</label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            onChange={(e) => handleStoreSelect(e.target.value)}
            defaultValue=""
            {...register('storeId', { required: 'Выберите магазин' })}
          >
            <option value="" disabled>Выберите магазин</option>
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          {errors.storeId && <p className="text-red-500 mt-1">{errors.storeId.message}</p>}
        </div>
        
        {selectedStore && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Тип выгрузки</label>
            <div className="flex items-center mb-2">
              <input
                type="radio"
                id="all"
                value="all"
                className="mr-2"
                {...register('exportType', { required: 'Выберите тип выгрузки' })}
              />
              <label htmlFor="all">Все товары</label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="selected"
                value="selected"
                className="mr-2"
                {...register('exportType', { required: 'Выберите тип выгрузки' })}
              />
              <label htmlFor="selected">Выбрать категорию</label>
            </div>
            {errors.exportType && <p className="text-red-500 mt-1">{errors.exportType.message}</p>}
          </div>
        )}
        
        {selectedStore && exportType === 'selected' && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Выберите категорию</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              defaultValue=""
              {...register('categoryId', { required: 'Выберите категорию' })}
            >
              <option value="" disabled>Выберите категорию</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-red-500 mt-1">{errors.categoryId.message}</p>}
          </div>
        )}
        
        {loading && exportProgress > 0 && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">Прогресс: {exportProgress}%</p>
          </div>
        )}
        
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md"
          disabled={loading}
        >
          {loading ? 'Выгрузка...' : 'Выгрузить товары'}
        </button>
      </form>
    </div>
  );
};

export default ProductExportForm;
