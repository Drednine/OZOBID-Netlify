"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface RegisterFormProps {
  onSuccess?: () => void;
}

interface FormValues {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  companyName: string;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      companyName: ''
    }
  });
  
  const password = watch('password');
  
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Регистрация через email/password вместо анонимной аутентификации
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            company_name: data.companyName
          }
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (authData && authData.user) {
        // Создание записи в таблице пользователей
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: data.email,
              full_name: data.fullName,
              company_name: data.companyName,
              created_at: new Date().toISOString()
            }
          ]);
        
        if (profileError) {
          throw new Error(profileError.message);
        }
        
        setMessage({
          text: 'Регистрация успешна! Проверьте вашу почту для подтверждения аккаунта.',
          type: 'success'
        });
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      setMessage({
        text: `Ошибка при регистрации: ${(error as Error).message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">Регистрация</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${
          message.type === 'error' ? 'bg-red-100 text-red-700' :
          message.type === 'success' ? 'bg-green-100 text-green-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            {...register('email', { required: 'Email обязателен', pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Некорректный email'
            }})}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            {...register('password', { 
              required: 'Пароль обязателен',
              minLength: { value: 6, message: 'Пароль должен содержать минимум 6 символов' }
            })}
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>
        
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Подтверждение пароля
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            {...register('confirmPassword', { 
              required: 'Подтвердите пароль',
              validate: value => value === password || 'Пароли не совпадают'
            })}
          />
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
        </div>
        
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Полное имя
          </label>
          <input
            id="fullName"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            {...register('fullName', { required: 'Укажите ваше имя' })}
          />
          {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>}
        </div>
        
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
            Название компании
          </label>
          <input
            id="companyName"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            {...register('companyName', { required: 'Укажите название компании' })}
          />
          {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>}
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-200"
          disabled={loading}
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
