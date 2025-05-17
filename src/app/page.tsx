'use client';

import React, { useState } from 'react';
import RegisterForm from '@/components/RegisterForm';
import MultiStoreForm from '@/components/MultiStoreForm';
import ProductExportForm from '@/components/ProductExportForm';

const userId = 'mock-user-id'; // Заменить на реальный ID при интеграции
const credentials = {
  clientId: 'your-client-id',
  apiKey: 'your-api-key'
}; // Тоже можно заменить на реальные данные из Supabase или формы

export default function Home() {
  const [active, setActive] = useState<'register' | 'stores' | 'export'>('register');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Панель OZOBID</h1>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActive('register')}
            className={`px-4 py-2 rounded ${active === 'register' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Регистрация
          </button>
          <button
            onClick={() => setActive('stores')}
            className={`px-4 py-2 rounded ${active === 'stores' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Магазины
          </button>
          <button
            onClick={() => setActive('export')}
            className={`px-4 py-2 rounded ${active === 'export' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Выгрузка товаров
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {active === 'register' && <RegisterForm />}
          {active === 'stores' && <MultiStoreForm userId={userId} />}
          {active === 'export' && <ProductExportForm userId={userId} credentials={credentials} />}
        </div>
      </div>
    </div>
  );
}
