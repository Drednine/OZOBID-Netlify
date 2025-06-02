'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import MultiStoreForm from '@/components/MultiStoreForm';
import ProductExportForm from '@/components/ProductExportForm';

export default function DashboardPage() {
  const router = useRouter();
  const [active, setActive] = useState<'stores' | 'export'>('stores');
  const [userId, setUserId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/auth/login');
          return;
        }

        setUserId(user.id);
        console.log('DashboardPage: User ID set:', user.id);

        // Загрузка Seller Credentials
        const { data: sellerData, error: sellerError } = await supabase
          .from('ozon_seller_credentials')
          .select('*')
          .eq('user_id', user.id)
          .limit(1) // Предполагаем, что пока нужен один активный магазин
          .single(); // single() вернет ошибку, если не найдено или найдено больше одной строки, если limit не сработает как ожидается

        if (sellerError && sellerError.code !== 'PGRST116') { // PGRST116 - это ошибка, когда .single() не находит записей, это нормально
          console.error('Error loading seller credentials:', sellerError);
        }
        console.log('DashboardPage: Seller credentials data:', sellerData);

        // Загрузка Performance Credentials (если есть Seller credentials с таким же именем)
        // Это упрощенная логика, в идеале нужна связь по ID магазина, а не по имени
        let performanceData = null;
        if (sellerData && sellerData.name) {
          const { data: perfData, error: perfError } = await supabase
            .from('ozon_performance_credentials')
            .select('*')
            .eq('user_id', user.id)
            .eq('name', sellerData.name) // Связываем по имени магазина и user_id
            .limit(1)
            .single();
          
          if (perfError && perfError.code !== 'PGRST116') {
            console.error('Error loading performance credentials:', perfError);
          }
          performanceData = perfData;
          console.log('DashboardPage: Performance credentials data:', performanceData);
        }

        if (sellerData && performanceData) {
          setCredentials({
            storeName: sellerData.name,
            sellerClientId: sellerData.client_id,
            sellerApiKey: sellerData.api_key, // Важно: это реальный ключ, будьте осторожны с его передачей
            performanceClientId: performanceData.ozon_client_id,
            performanceApiKey: performanceData.ozon_client_secret, // Это реальный ключ
            // Можно добавить и другие поля, если они нужны компоненту ProductExportForm
          });
          console.log('DashboardPage: Credentials set for store:', sellerData.name);
        } else {
          setCredentials(null); // Сбрасываем, если не найдены полные данные
          console.log('DashboardPage: Credentials not fully found or missing, set to null.');
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading user data:', error);
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  const handleStoreAdded = async () => {
    setLoading(true); // Показываем загрузчик
    // Перезагружаем данные пользователя и магазинов
    // Копируем логику из useEffect или выносим в отдельную функцию
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/auth/login');
        return;
      }
      setUserId(user.id);
      const { data: sellerData, error: sellerError } = await supabase
        .from('ozon_seller_credentials')
        .select('*').eq('user_id', user.id).limit(1).single();
      let performanceData = null;
      if (sellerData && sellerData.name) {
        const { data: perfData, error: perfError } = await supabase
          .from('ozon_performance_credentials')
          .select('*').eq('user_id', user.id).eq('name', sellerData.name).limit(1).single();
        if (perfError && perfError.code !== 'PGRST116') console.error('Error reloading perf creds:', perfError);
        performanceData = perfData;
      }
      if (sellerError && sellerError.code !== 'PGRST116') console.error('Error reloading seller creds:', sellerError);
      
      if (sellerData && performanceData) {
        setCredentials({
          storeName: sellerData.name,
          sellerClientId: sellerData.client_id,
          sellerApiKey: sellerData.api_key,
          performanceClientId: performanceData.ozon_client_id,
          performanceApiKey: performanceData.ozon_client_secret,
        });
        console.log('DashboardPage: Credentials reloaded after store add.');
      } else {
        setCredentials(null);
        console.log('DashboardPage: Credentials not found after store add, set to null.');
      }
    } catch (error) {
      console.error('Error reloading data after store add:', error);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl font-bold text-gray-900">OZOBID</h1>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <button
                    onClick={() => setActive('stores')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      active === 'stores'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Магазины
                  </button>
                  <button
                    onClick={() => setActive('export')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      active === 'export'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Выгрузка товаров
                  </button>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow p-6">
              {active === 'stores' && userId && (
                <MultiStoreForm userId={userId} onSuccess={handleStoreAdded} />
              )}
              {active === 'export' && userId && credentials && (
                <ProductExportForm userId={userId} credentials={credentials} />
              )}
              {active === 'export' && !credentials && (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium text-gray-900">Добавьте учетные данные магазина</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Для работы с товарами необходимо добавить учетные данные магазина OZON
                  </p>
                  <button
                    onClick={() => setActive('stores')}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Добавить магазин
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 