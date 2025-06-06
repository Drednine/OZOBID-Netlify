"use client";

import React, { useState, useEffect } from 'react';
import ProductExportPage from '@/components/ProductExportPage';
import { supabase } from '@/lib/supabase';
const ProductsPage = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Получение текущего пользователя
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          throw new Error('Ошибка авторизации: ' + authError.message);
        }
        
        if (!user) {
          throw new Error('Необходимо авторизоваться');
        }
        
        setUserId(user.id);
        
        // Получение учетных данных OZON
        const { data: credentialsData, error: credentialsError } = await supabase
          .from('ozon_credentials')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (credentialsError && credentialsError.code !== 'PGRST116') {
          throw new Error('Ошибка при получении учетных данных: ' + credentialsError.message);
        }
        
        if (!credentialsData) {
          throw new Error('Необходимо добавить учетные данные OZON');
        }
        
        setCredentials({
          clientId: credentialsData.client_id,
          apiKey: credentialsData.api_key
        });
        
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.href = '/'}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          Вернуться на главную
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {userId && credentials && (
        <ProductExportPage userId={userId} credentials={credentials} />
      )}
    </div>
  );
};

export default ProductsPage;
