'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import RegisterForm from '@/components/RegisterForm';
import MultiStoreForm from '@/components/MultiStoreForm';
import ProductExportForm from '@/components/ProductExportForm';
import type { NextPage } from 'next';

const userId = 'mock-user-id'; // Заменить на реальный ID при интеграции
const credentials = {
  clientId: 'your-client-id',
  apiKey: 'your-api-key'
}; // Тоже можно заменить на реальные данные из Supabase или формы

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/login');
      } else {
        router.push('/dashboard');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
