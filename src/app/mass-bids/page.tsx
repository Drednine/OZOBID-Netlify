"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import MassBidManagementForm from '@/components/MassBidManagementForm';
import type { NextPage } from 'next';

const MassBidsPage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);

      // Получение текущего пользователя
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!data?.user) {
        throw new Error('Необходимо авторизоваться');
      }

      setUser(data.user);

      // Получение учетных данных OZON
      const { data: credentialsData, error: credentialsError } = await supabase
        .from('ozon_credentials')
        .select('*')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .single();

      if (credentialsError || !credentialsData) {
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

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div className='text-red-500'>{error}</div>;

  return (
    <div className='container mx-auto p-4'>
      <h1 className='text-2xl font-bold mb-6'>Массовое управление ставками</h1>
      <MassBidManagementForm userId={user.id} credentials={credentials} />
    </div>
  );
};

export default MassBidsPage;
