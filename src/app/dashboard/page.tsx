'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AuthGuard from '@/components/AuthGuard';
import MultiStoreForm from '@/components/MultiStoreForm';
import ProductExportForm from '@/components/ProductExportForm';
import CampaignsPage from './campaigns/page';

// Определим интерфейс для магазина, чтобы было понятнее
interface Store {
  id: string; // id из ozon_seller_credentials
  name: string;
  sellerClientId: string;
  sellerApiKey: string;
  performanceClientId?: string;
  performanceApiKey?: string;
  // Можно добавить другие поля при необходимости, например, created_at
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'stores' | 'export' | 'campaigns'>('stores'); // Переименовано active в activeTab и добавлена опция campaigns
  const [userId, setUserId] = useState<string | null>(null);
  
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<any>(null); // Это будет производным от activeStoreId и allStores
  
  const [loading, setLoading] = useState(true);

  const loadUserAndStores = async (currentUserId?: string) => {
    setLoading(true);
    try {
      let uId = currentUserId;
      if (!uId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/auth/login');
          setLoading(false);
          return;
        }
        setUserId(user.id);
        uId = user.id;
        console.log('DashboardPage: User ID set:', uId);
      }

      if (!uId) {
        console.error("DashboardPage: User ID is null, cannot load stores.");
        setLoading(false);
        return;
      }

      // Загрузка всех Seller Credentials для пользователя
      const { data: sellerCredentials, error: sellerError } = await supabase
        .from('ozon_seller_credentials')
        .select('*')
        .eq('user_id', uId);

      if (sellerError) {
        console.error('Error loading seller credentials:', sellerError);
        setAllStores([]);
        setLoading(false);
        return;
      }

      if (!sellerCredentials || sellerCredentials.length === 0) {
        console.log('DashboardPage: No seller credentials found for user.');
        setAllStores([]);
        setActiveStoreId(null);
        setLoading(false);
        return;
      }
      console.log('DashboardPage: Seller credentials data:', sellerCredentials);

      const storesWithDetails: Store[] = await Promise.all(
        sellerCredentials.map(async (sellerCred) => {
          let performanceCredential = null;
          if (sellerCred.name) { 
            const { data: perfData, error: perfError } = await supabase
              .from('ozon_performance_credentials')
              .select('*')
              .eq('user_id', uId!)
              .eq('name', sellerCred.name) 
              .single();

            if (perfError && perfError.code !== 'PGRST116') { 
              console.warn(`Error loading performance credentials for store ${sellerCred.name}:`, perfError);
            }
            performanceCredential = perfData;
          }
          return {
            id: sellerCred.id,
            name: sellerCred.name,
            sellerClientId: sellerCred.client_id,
            sellerApiKey: sellerCred.api_key,
            performanceClientId: performanceCredential?.ozon_client_id,
            performanceApiKey: performanceCredential?.ozon_client_secret,
          };
        })
      );

      setAllStores(storesWithDetails);
      console.log('DashboardPage: All stores with details:', storesWithDetails);

      if (storesWithDetails.length > 0) {
        const currentActiveIsValid = activeStoreId && storesWithDetails.some(s => s.id === activeStoreId);
        if (currentActiveIsValid) {
          console.log('DashboardPage: Keeping existing active store:', activeStoreId);
        } else {
          setActiveStoreId(storesWithDetails[0].id);
          console.log('DashboardPage: Setting first store as active:', storesWithDetails[0].id);
        }
      } else {
        setActiveStoreId(null);
      }

    } catch (error) {
      console.error('Error in loadUserAndStores:', error);
      setAllStores([]);
      setActiveStoreId(null);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка пользователя и магазинов при монтировании
  useEffect(() => {
    async function initialLoad() {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !currentUser) {
            router.push('/auth/login');
            return;
        }
        setUserId(currentUser.id);
        loadUserAndStores(currentUser.id); 
    }
    initialLoad();
  }, [router]); // router здесь для случая редиректа, если пользователь не авторизован

  // Эффект для обновления credentials когда меняется activeStoreId или allStores
  useEffect(() => {
    if (activeStoreId && allStores.length > 0) {
      const currentActiveStore = allStores.find(store => store.id === activeStoreId);
      if (currentActiveStore) {
        setCredentials({
          storeName: currentActiveStore.name,
          sellerClientId: currentActiveStore.sellerClientId,
          sellerApiKey: currentActiveStore.sellerApiKey, 
          performanceClientId: currentActiveStore.performanceClientId,
          performanceApiKey: currentActiveStore.performanceApiKey,
        });
        console.log('DashboardPage: Credentials updated for active store:', currentActiveStore.name);
      } else {
        setCredentials(null);
        console.log('DashboardPage: Active store ID set, but store not found in allStores. Credentials set to null.');
      }
    } else {
      setCredentials(null);
      console.log('DashboardPage: No active store or no stores available, credentials set to null.');
    }
  }, [activeStoreId, allStores]);

  const handleStoreAdded = () => {
    console.log('DashboardPage: Store added, reloading user and stores...');
    if (userId) {
        loadUserAndStores(userId);
    } else {
        // Если userId еще не установлен, пробуем загрузить его снова и затем магазины
        const reloadAll = async () => {
            const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
            if (userError || !currentUser) {
                router.push('/auth/login');
                return;
            }
            setUserId(currentUser.id);
            loadUserAndStores(currentUser.id);
        }
        reloadAll();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading && !allStores.length) { // Показываем главный лоадер, если магазины еще не загружены
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
                    onClick={() => setActiveTab('stores')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      activeTab === 'stores'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Магазины
                  </button>
                  <button
                    onClick={() => setActiveTab('export')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      activeTab === 'export'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Выгрузка товаров
                  </button>
                  <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      activeTab === 'campaigns'
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Рекламные кампании
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
              {activeTab === 'stores' && userId && (
                <>
                  <MultiStoreForm userId={userId} onSuccess={handleStoreAdded} />
                  {allStores.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Ваши магазины:</h3>
                      {loading && allStores.length > 0 && <p>Обновление списка...</p> } {/* Показываем если обновляем существующий список*/}
                      <div className="space-y-3">
                        {allStores.map((store) => (
                          <button
                            key={store.id}
                            onClick={() => setActiveStoreId(store.id)}
                            className={`block w-full text-left px-4 py-3 rounded-md border-2 transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                              store.id === activeStoreId
                                ? 'bg-blue-50 border-blue-500 shadow-md'
                                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                            }`}
                          >
                            <p className="font-semibold text-gray-800 text-lg">{store.name}</p>
                            <p className="text-sm text-gray-600">Seller Client ID: {store.sellerClientId}</p>
                            {store.performanceClientId ? (
                              <p className="text-sm text-gray-600">Performance Client ID: {store.performanceClientId}</p>
                            ) : (
                              <p className="text-sm text-yellow-600 font-medium">Performance API не подключен</p>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {allStores.length === 0 && !loading && (
                    <div className="mt-8 text-center text-gray-500 py-8">
                       <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                         <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                       </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Магазины не найдены</h3>
                      <p className="mt-1 text-sm text-gray-500">У вас пока нет добавленных магазинов. Добавьте первый магазин, чтобы начать.</p>
                    </div>
                  )}
                </>
              )}
              {activeTab === 'export' && userId && credentials && (
                <ProductExportForm userId={userId} credentials={credentials} />
              )}
              {activeTab === 'export' && !credentials && !loading && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Выберите магазин</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Чтобы выгрузить товары, пожалуйста, сначала добавьте магазин и/или выберите активный магазин на вкладке "Магазины".
                  </p>
                   <button
                      onClick={() => setActiveTab('stores')}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Перейти к магазинам
                    </button>
                </div>
              )}
               {activeTab === 'export' && loading && (
                 <div className="flex justify-center items-center min-h-[200px]">
                   <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                 </div>
                )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
} 