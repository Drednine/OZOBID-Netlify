"use client";

import React, { useState, useEffect } from 'react';
import MassBidManagementForm from '@/components/MassBidManagementForm';
import { supabase } from '@/lib/supabase';

const MassBidPage = () => {
  const [userId, setUserId] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw new Error('Ошибка авторизации');
      
      setUserId(user.id);
      
      const { data: credentialsData, error: credentialsError } = await supabase
        .from('ozon_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (credentialsError && credentialsError.code !== 'PGRST116') {
        throw new Error('Ошибка при получении учетных данных');
      }
      
        throw new Error('Необходимо добавить учетные данные OZON');
      }
      
      setCredentials({
        clientId: credentialsData.client_id,
        apiKey: credentialsData.api_key
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <h1>Массовое управление ставками</h1>
      {userId && credentials && (
        <MassBidManagementForm userId={userId} credentials={credentials} />
      )}
    </div>
  );
};

export default MassBidPage;