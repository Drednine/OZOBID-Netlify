"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface MultiStoreFormProps {
  userId: string;
}

interface FormValues {
  storeName: string;
  clientId: string;
  apiKey: string;
  isDefault: boolean;
}

const MultiStoreForm: React.FC<MultiStoreFormProps> = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>();
  
  // Загрузка существующих магазинов пользователя
  useEffect(() => {
    const loadStores = async () => {
      setLoading(true);
      
      try {
        // В реальном приложении здесь будет запрос к Supabase для получения магазинов пользователя
        // Для демонстрации используем моковые данные
        setTimeout(() => {
          setStores([
            { id: 'store1', name: 'Основной магазин', client_id: '12345', is_default: true },
            { id: 'store2', name: 'Второй магазин', client_id: '67890', is_default: false }
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
  
  // Обработчик отправки формы для добавления нового магазина
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage('');
    
    try {
      // В реальном приложении здесь будет запрос к Supabase для сохранения нового магазина
      // Для демонстрации используем таймаут
      setTimeout(() => {
        // Добавляем новый магазин в список
        const newStore = {
          id: 'store' + (stores.length + 1),
          name: data.storeName,
          client_id: data.clientId,
          is_default: data.isDefault
        };
        
        // Если новый магазин установлен как дефолтный, обновляем статус других магазинов
        if (data.isDefault) {
          setStores(prevStores => 
            prevStores.map(store => ({
              ...store,
              is_default: false
            })).concat([newStore])
          );
        } else {
          setStores(prevStores => [...prevStores, newStore]);
        }
        
        setMessage('Магазин успешно добавлен');
        reset(); // Очищаем форму
        setLoading(false);
      }, 1000);
    } catch (error) {
      setMessage('Ошибка при добавлении магазина: ' + error.message);
      setLoading(false);
    }
  };
  
  // Обработчик удаления магазина
  const handleDeleteStore = async (storeId: string) => {
    setLoading(true);
    
    try {
      // В реальном приложении здесь будет запрос к Supabase для удаления магазина
      // Для демонстрации используем таймаут
      setTimeout(() => {
        setStores(prevStores => prevStores.filter(store => store.id !== storeId));
        setMessage('Магазин успешно удален');
        setLoading(false);
      }, 500);
    } catch (error) {
      setMessage('Ошибка при удалении магазина: ' + error.message);
      setLoading(false);
    }
  };
  
  // Обработчик установки магазина по умолчанию
  const handleSetDefaultStore = async (storeId: string) => {
    setLoading(true);
    
    try {
      // В реальном приложении здесь будет запрос к Supabase для обновления статуса магазина
      // Для демонстрации используем таймаут
      setTimeout(() => {
        setStores(prevStores => 
          prevStores.map(store => ({
            ...store,
            is_default: store.id === storeId
          }))
        );
        setMessage('Магазин по умолчанию обновлен');
        setLoading(false);
      }, 500);
    } catch (error) {
      setMessage('Ошибка при обновлении магазина: ' + error.message);
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Управление магазинами</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.includes('Ошибка') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}
      
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Ваши магазины</h3>
        
        {stores.length === 0 ? (
          <p className="text-gray-500">У вас пока нет добавленных магазинов</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название</th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody>
                {stores.map(store => (
                  <tr key={store.id}>
                    <td className="py-2 px-4 border-b border-gray-200">{store.name}</td>
                    <td className="py-2 px-4 border-b border-gray-200">{store.client_id}</td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {store.is_default ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          По умолчанию
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Обычный
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 border-b border-gray-200">
                      {!store.is_default && (
                        <button
                          onClick={() => handleSetDefaultStore(store.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          disabled={loading}
                        >
                          Сделать основным
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteStore(store.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={loading}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-xl font-semibold mb-4">Добавить новый магазин</h3>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Название магазина</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                {...register('storeName', { required: 'Название магазина обязательно' })}
              />
              {errors.storeName && <p className="text-red-500 mt-1">{errors.storeName.message}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Client ID</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                {...register('clientId', { required: 'Client ID обязателен' })}
              />
              {errors.clientId && <p className="text-red-500 mt-1">{errors.clientId.message}</p>}
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">API Key</label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-md"
                {...register('apiKey', { required: 'API Key обязателен' })}
              />
              {errors.apiKey && <p className="text-red-500 mt-1">{errors.apiKey.message}</p>}
            </div>
            
            <div className="flex items-center mt-8">
              <input
                type="checkbox"
                id="isDefault"
                className="mr-2"
                {...register('isDefault')}
              />
              <label htmlFor="isDefault">Установить как магазин по умолчанию</label>
            </div>
          </div>
          
          <button
            type="submit"
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md"
            disabled={loading}
          >
            {loading ? 'Добавление...' : 'Добавить магазин'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MultiStoreForm;
