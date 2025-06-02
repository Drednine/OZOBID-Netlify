"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
// Удаляем прямые импорты функций валидации, так как они теперь на бэкенде
// import { validateCredentials, validatePerformanceCredentials } from '@/lib/ozonApi';

interface MultiStoreFormProps {
  userId: string;
  onSuccess?: (clientId: string, apiKey: string) => void; // Уточнить, какие данные нужны onSuccess
}

interface FormValues {
  storeName: string;
  sellerClientId: string;
  sellerApiKey: string;
  performanceClientId: string;
  performanceClientSecret: string; // В Ozon Performance API это обычно называется Api-Key, а не Client Secret
}

const MultiStoreForm: React.FC<MultiStoreFormProps> = ({ userId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  // Удаляем validating, так как isLoading будет покрывать и валидацию через API
  // const [validating, setValidating] = useState(false); 
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  // Удаляем функцию validateApiKeys, так как валидация теперь на бэкенде
  /*
  const validateApiKeys = async (data: FormValues) => {
    setValidating(true);
    setMessage('Проверка ключей API...');
    // ... остальная часть удаленной функции
  };
  */

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage('');
    setSuccess(false);

    try {
      // Шаг 1: Вызов API-роута для валидации ключей
      const validationResponse = await fetch('/api/validate-ozon-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: data.storeName,
          sellerApi: {
            clientId: data.sellerClientId,
            apiKey: data.sellerApiKey,
          },
          performanceApi: {
            clientId: data.performanceClientId,
            apiKey: data.performanceClientSecret, // Убедитесь, что это правильное поле
          },
        }),
      });

      const validationResult = await validationResponse.json();

      if (!validationResponse.ok) {
        // Ошибка от API-роута (валидация не прошла или другая ошибка на сервере)
        throw new Error(validationResult.error || `Ошибка сервера: ${validationResponse.status}`);
      }
      
      // Если валидация через API прошла успешно (validationResult.message будет содержать сообщение успеха)
      // setMessage(validationResult.message); // Можно показать сообщение от API, или кастомное
      setMessage('Ключи API успешно проверены. Сохранение данных магазина...');

      // Шаг 2.1: Сохранение данных Seller API в ozon_seller_credentials
      console.log('Attempting to save Seller credentials to Supabase with data:', {
        user_id: userId,
        name: data.storeName,
        client_id: data.sellerClientId,
        // Omitting api_key from log for security
      });

      const { error: sellerDbError } = await supabase
        .from('ozon_seller_credentials') 
        .insert([
          {
            user_id: userId,
            name: data.storeName,
            client_id: data.sellerClientId, 
            api_key: data.sellerApiKey,     
          },
        ]);

      if (sellerDbError) {
        console.error('Supabase Seller DB Error object:', sellerDbError);
        const errorMessage = sellerDbError.message || 'Неизвестная ошибка базы данных при сохранении Seller API ключей';
        throw new Error(`Ошибка сохранения Seller API: ${errorMessage} (Код: ${sellerDbError.code || 'N/A'}, Детали: ${sellerDbError.details || 'N/A'})`);
      }
      console.log('Seller credentials saved successfully.');

      // Шаг 2.2: Сохранение данных Performance API в ozon_performance_credentials
      console.log('Attempting to save Performance credentials to Supabase with data:', {
        user_id: userId,
        name: data.storeName,
        ozon_client_id: data.performanceClientId,
        // Omitting ozon_client_secret from log for security
      });

      const { error: performanceDbError } = await supabase
        .from('ozon_performance_credentials') 
        .insert([
          {
            user_id: userId,
            name: data.storeName, // Добавляем имя магазина для консистентности
            ozon_client_id: data.performanceClientId,
            ozon_client_secret: data.performanceClientSecret, // Это поле формы содержит Performance API Key
            // access_token, token_expires_at, ozon_advertiser_id - пока не заполняем
          },
        ]);
      
      if (performanceDbError) {
        console.error('Supabase Performance DB Error object:', performanceDbError);
        // Важно: если ключи Seller сохранились, а Performance нет, нужно либо откатывать транзакцию (сложно без бэкенда),
        // либо четко сообщить пользователю, что сохранилось частично.
        // Пока просто выбрасываем ошибку.
        const errorMessage = performanceDbError.message || 'Неизвестная ошибка базы данных при сохранении Performance API ключей';
        throw new Error(`Ошибка сохранения Performance API: ${errorMessage} (Код: ${performanceDbError.code || 'N/A'}, Детали: ${performanceDbError.details || 'N/A'})`);
      }
      console.log('Performance credentials saved successfully.');

      setSuccess(true);
      setMessage('Магазин успешно добавлен и ключи проверены!'); // Обновленное сообщение

      if (onSuccess) {
        // Передаем нужные данные в onSuccess, если это все еще требуется
        // Например, если onSuccess ожидает Seller API ключи:
        onSuccess(data.sellerClientId, data.sellerApiKey);
      }

    } catch (error) {
      // Улучшенная обработка отображения сообщения об ошибке
      let displayMessage = 'Произошла неизвестная ошибка.';
      if (error instanceof Error && error.message) {
        displayMessage = error.message;
      } else if (typeof error === 'string') {
        displayMessage = error;
      }
      // Логируем оригинальную ошибку для отладки
      console.error('Caught error in onSubmit:', error);
      setMessage('Ошибка: ' + displayMessage);
      setSuccess(false); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='max-w-md mx-auto bg-white p-6 rounded-lg shadow-md'>
      <h2 className='text-2xl font-bold mb-6'>Добавление магазина Ozon</h2>

      {message && (
        <div className={'p-4 mb-4 rounded ' + (success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className='mb-4'>
          <label htmlFor='storeName' className='block text-sm font-medium text-gray-700 mb-1'>
            Название магазина
          </label>
          <input
            id='storeName'
            type='text'
            className={'w-full px-3 py-2 border rounded-md ' + (errors.storeName ? 'border-red-500' : 'border-gray-300')}
            {...register('storeName', {
              required: 'Название магазина обязательно'
            })}
          />
          {errors.storeName && <p className='mt-1 text-sm text-red-500'>{errors.storeName.message}</p>}
        </div>

        <div className='border-t border-gray-200 pt-4 mb-4'>
          <h3 className='text-lg font-medium mb-3'>Seller API (для работы с товарами)</h3>
          
          <div className='mb-4'>
            <label htmlFor='sellerClientId' className='block text-sm font-medium text-gray-700 mb-1'>
              Client ID
            </label>
            <input
              id='sellerClientId'
              type='text'
              className={'w-full px-3 py-2 border rounded-md ' + (errors.sellerClientId ? 'border-red-500' : 'border-gray-300')}
              {...register('sellerClientId', {
                required: 'Client ID обязателен'
              })}
            />
            {errors.sellerClientId && <p className='mt-1 text-sm text-red-500'>{errors.sellerClientId.message}</p>}
          </div>

          <div className='mb-4'>
            <label htmlFor='sellerApiKey' className='block text-sm font-medium text-gray-700 mb-1'>
              API Key
            </label>
            <input
              id='sellerApiKey'
              type='password'
              className={'w-full px-3 py-2 border rounded-md ' + (errors.sellerApiKey ? 'border-red-500' : 'border-gray-300')}
              {...register('sellerApiKey', {
                required: 'API Key обязателен'
              })}
            />
            {errors.sellerApiKey && <p className='mt-1 text-sm text-red-500'>{errors.sellerApiKey.message}</p>}
          </div>
        </div>

        <div className='border-t border-gray-200 pt-4 mb-4'>
          <h3 className='text-lg font-medium mb-3'>Performance API (для работы с рекламой)</h3>
          
          <div className='mb-4'>
            <label htmlFor='performanceClientId' className='block text-sm font-medium text-gray-700 mb-1'>
              Client ID
            </label>
            <input
              id='performanceClientId'
              type='text'
              className={'w-full px-3 py-2 border rounded-md ' + (errors.performanceClientId ? 'border-red-500' : 'border-gray-300')}
              {...register('performanceClientId', {
                required: 'Performance Client ID обязателен'
              })}
            />
            {errors.performanceClientId && <p className='mt-1 text-sm text-red-500'>{errors.performanceClientId.message}</p>}
          </div>

          <div className='mb-6'>
            <label htmlFor='performanceClientSecret' className='block text-sm font-medium text-gray-700 mb-1'>
              Client Secret
            </label>
            <input
              id='performanceClientSecret'
              type='password'
              className={'w-full px-3 py-2 border rounded-md ' + (errors.performanceClientSecret ? 'border-red-500' : 'border-gray-300')}
              {...register('performanceClientSecret', {
                required: 'Performance Client Secret обязателен'
              })}
            />
            {errors.performanceClientSecret && <p className='mt-1 text-sm text-red-500'>{errors.performanceClientSecret.message}</p>}
          </div>
        </div>

        <button
          type='submit'
          className='w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50'
          disabled={loading}
        >
          {loading ? 'Добавление...' : 'Добавить магазин'}
        </button>
      </form>
    </div>
  );
};

export default MultiStoreForm;