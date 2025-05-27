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

      // Шаг 2: Сохранение данных магазина в Supabase (только если валидация успешна)
      const { error: dbError } = await supabase
        .from('stores') // Убедитесь, что таблица называется 'stores'
        .insert([
          {
            user_id: userId,
            name: data.storeName,
            client_id: data.sellerClientId, // Seller Client ID
            api_key: data.sellerApiKey,     // Seller API Key (нужно шифровать!)
            performance_client_id: data.performanceClientId,
            performance_api_key: data.performanceClientSecret, // Performance API Key (тоже шифровать!)
            // created_at: new Date().toISOString() // Supabase может делать это автоматически
          },
        ]);

      if (dbError) {
        // Если ошибка при сохранении в базу, но валидация ключей была успешной
        throw new Error(`Ключи валидны, но произошла ошибка при сохранении магазина: ${dbError.message}`);
      }

      setSuccess(true);
      setMessage('Магазин успешно добавлен и ключи проверены!'); // Обновленное сообщение

      if (onSuccess) {
        // Передаем нужные данные в onSuccess, если это все еще требуется
        // Например, если onSuccess ожидает Seller API ключи:
        onSuccess(data.sellerClientId, data.sellerApiKey);
      }

    } catch (error) {
      setMessage('Ошибка: ' + (error as Error).message);
      setSuccess(false); // Убедимся, что success сброшен при ошибке
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