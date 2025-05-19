"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { validateCredentials, validatePerformanceCredentials } from '@/lib/ozonApi';

interface MultiStoreFormProps {
  userId: string;
  onSuccess?: (clientId: string, apiKey: string) => void;
}

interface FormValues {
  storeName: string;
  sellerClientId: string;
  sellerApiKey: string;
  performanceClientId: string;
  performanceClientSecret: string;
}

const MultiStoreForm: React.FC<MultiStoreFormProps> = ({ userId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  const validateApiKeys = async (data: FormValues) => {
    setValidating(true);
    setMessage('Проверка ключей API...');

    try {
      // Проверка Seller API ключей
      const sellerCredentials = {
        clientId: data.sellerClientId,
        apiKey: data.sellerApiKey
      };
      
      const { valid: sellerValid, error: sellerError } = await validateCredentials(sellerCredentials);
      
      if (sellerValid === false) {
        throw new Error(sellerError || 'Ошибка валидации Seller API ключей');
      }
      
      // Проверка Performance API ключей
      const performanceCredentials = {
        clientId: data.performanceClientId,
        apiKey: data.performanceClientSecret
      };
      
      const { valid: performanceValid, error: performanceError } = await validatePerformanceCredentials(performanceCredentials);
      
      if (performanceValid === false) {
        throw new Error(performanceError || 'Ошибка валидации Performance API ключей');
      }
      
      setMessage('Ключи API успешно проверены');
      return true;
    } catch (error) {
      setMessage('Ошибка валидации: ' + (error as Error).message);
      return false;
    } finally {
      setValidating(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage('');
    setSuccess(false);

    try {
      // Валидация ключей API
      const isValid = await validateApiKeys(data);
      
      if (isValid === false) {
        return;
      }

      // Сохранение данных магазина в Supabase
      const { error } = await supabase
        .from('stores')
        .insert([
          {
            user_id: userId,
            name: data.storeName,
            client_id: data.sellerClientId,
            api_key: data.sellerApiKey,
            performance_client_id: data.performanceClientId,
            performance_client_secret: data.performanceClientSecret,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw new Error(error.message);

      setSuccess(true);
      setMessage('Магазин успешно добавлен!');

      if (onSuccess) {
        onSuccess(data.sellerClientId, data.sellerApiKey);
      }
    } catch (error) {
      setMessage('Ошибка при добавлении магазина: ' + (error as Error).message);
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

        <div className='flex items-center justify-between'>
          <button
            type='submit'
            className='w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-200'
            disabled={loading || validating}
          >
            {loading ? 'Добавление...' : validating ? 'Проверка ключей...' : 'Добавить магазин'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MultiStoreForm;