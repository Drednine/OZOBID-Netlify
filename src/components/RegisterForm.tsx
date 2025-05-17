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
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();
  const password = watch('password');
  
  // Обработчик отправки формы регистрации
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage('');
    
    try {
      // В реальном приложении здесь будет запрос к Supabase для регистрации пользователя
      // и создания записи в таблице users
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            company_name: data.companyName
          }
        }
      });
      
      if (authError) throw new Error(authError.message);
      
      // Создаем запись в таблице users
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          { 
            id: authData.user?.id,
            email: data.email,
            full_name: data.fullName,
            company_name: data.companyName
          }
        ]);
      
      if (profileError) throw new Error(profileError.message);
      
      setSuccess(true);
      setMessage('Регистрация успешна! Теперь вы можете войти в систему.');
      
      // Вызываем колбэк успешной регистрации, если он предоставлен
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      setMessage('Ошибка при регистрации: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Регистрация</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border rounded-md"
            {...register('email', { 
              required: 'Email обязателен',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Некорректный email'
              }
            })}
          />
          {errors.email && <p className="text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Пароль</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-md"
            {...register('password', { 
              required: 'Пароль обязателен',
              minLength: {
                value: 8,
                message: 'Пароль должен содержать минимум 8 символов'
              }
            })}
          />
          {errors.password && <p className="text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Подтверждение пароля</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-md"
            {...register('confirmPassword', { 
              required: 'Подтвердите пароль',
              validate: value => value === password || 'Пароли не совпадают'
            })}
          />
          {errors.confirmPassword && <p className="text-red-500 mt-1">{errors.confirmPassword.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Полное имя</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            {...register('fullName', { required: 'Имя обязательно' })}
          />
          {errors.fullName && <p className="text-red-500 mt-1">{errors.fullName.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Название компании</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            {...register('companyName', { required: 'Название компании обязательно' })}
          />
          {errors.companyName && <p className="text-red-500 mt-1">{errors.companyName.message}</p>}
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md"
          disabled={loading}
        >
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>
        
        <div className="text-sm text-center mt-4">
          <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Уже есть аккаунт? Войти
          </a>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;
