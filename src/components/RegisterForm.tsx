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

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage('');

    try {
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

      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (error) {
      setMessage('Ошибка при регистрации: ' + (error as Error).message);
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
        {/* поля формы без изменений */}
        {/* ... */}
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
