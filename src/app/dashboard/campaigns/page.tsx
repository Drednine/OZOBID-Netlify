'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation'; // Добавим useRouter
import AuthGuard from '@/components/AuthGuard'; // Импорт AuthGuard
import { OzonPerformanceCredentials } from '@/lib/types/ozon'; // Обновленный путь к типу
import { UserCampaignSettings, CombinedCampaign as LocalCombinedCampaign } from '@/lib/types/campaigns'; // Предполагаем, что этот файл существует
import { createClient } from '@/utils/supabase/client'; // Предполагаем, что этот файл существует
import { User, RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

// Интерфейсы, скопированные или адаптированные из API маршрута
// OzonCampaignData и UserCampaignSettingData уже определены в '@/lib/types/campaigns' как часть CombinedCampaign
// Так что локальные определения можно будет удалить, если импорт работает корректно.
// Пока оставим для ясности, но нужно будет проверить и унифицировать.

// interface OzonCampaignData {
// id: number;
// title: string;
// state: string;
// budget: number;
// dailyBudget: number;
//   // ... другие поля от Ozon
// }

// interface UserCampaignSettingData {
//   id?: string; 
//   ozon_campaign_id: number;
//   performance_credentials_id?: string; 
//   user_id?: string; 
//   custom_daily_budget_limit: number | null;
//   is_budget_control_enabled: boolean;
//   app_controlled_status: string | null;
//   isDirty?: boolean; 
//   saveError?: string | null; 
//   isSaving?: boolean; 
//   scheduling_enabled: boolean;
//   schedule_start_time: string | null;
//   schedule_end_time: string | null;
//   schedule_days: string[] | null; // Изменено на string[]
//   last_checked_at: string | null;
//   last_daily_limit_pause_date: string | null;
//   cached_daily_spend: number | null;
//   cached_ozon_status: string | null;
// }

// Используем импортированный тип, если он доступен, иначе LocalCombinedCampaign
// interface CombinedCampaign extends OzonCampaignData {
//   userSettings: UserCampaignSettingData; 
// }

type CombinedCampaignType = LocalCombinedCampaign; // Используем псевдоним для импортированного типа

const CampaignsPage = () => {
  console.log('CampaignsPage: Component rendering started.');
  const router = useRouter(); // useRouter
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [stores, setStores] = useState<OzonPerformanceCredentials[]>([]);
  const [activeStoreCreds, setActiveStoreCreds] = useState<OzonPerformanceCredentials | null>(null);
  const [campaigns, setCampaigns] = useState<CombinedCampaignType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState<{[key: number]: boolean}>({});
  const [errorStatus, setErrorStatus] = useState<{[key: number]: string | null}>({});

  const fetchUserDataAndStores = useCallback(async () => {
    console.log('CampaignsPage: fetchUserDataAndStores called.');
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      console.error('CampaignsPage: Auth error or no current user. Redirecting to login.', authError);
      router.push('/auth/login');
      return;
    }
    console.log('CampaignsPage: User fetched:', currentUser.id);
    setUser(currentUser);

    console.log('CampaignsPage: Fetching performance credentials for user:', currentUser.id);
    const { data, error: dbError } = await supabase
      .from('ozon_performance_credentials')
      .select('*')
      .eq('user_id', currentUser.id);
    if (dbError) {
      console.error('CampaignsPage: Error fetching performance credentials:', dbError);
      setError('Ошибка загрузки магазинов Performance API.');
      setStores([]);
      setLoading(false);
      return;
    }

    console.log('CampaignsPage: Performance credentials fetched:', data);

    if (Array.isArray(data)) {
      setStores(data);
      if (data.length > 0) {
        console.log('CampaignsPage: Stores set. Total stores:', data.length, 'First store if exists:', data[0]?.name);
        if (!activeStoreCreds && data.length > 0) {
          console.log('CampaignsPage: Setting active store to the first one by default:', data[0].name);
          setActiveStoreCreds(data[0]);
        } else if (activeStoreCreds) {
          const currentActiveStillExists = data.find(s => s.id === activeStoreCreds.id);
          if (!currentActiveStillExists && data.length > 0) {
            console.log('CampaignsPage: Previously active store not found, setting to first available.');
            setActiveStoreCreds(data[0]);
          } else if (!currentActiveStillExists && data.length === 0) {
            console.log('CampaignsPage: No stores available after update, clearing active store.');
            setActiveStoreCreds(null);
          }
        }
      } else {
        console.log('CampaignsPage: No performance stores found for this user.');
        setStores([]);
        setActiveStoreCreds(null);
      }
    } else {
      console.warn('CampaignsPage: Performance credentials data is not an array:', data);
      setStores([]);
      setActiveStoreCreds(null);
    }
  }, [router, supabase, activeStoreCreds]);

  useEffect(() => {
    console.log('CampaignsPage: useEffect for fetchUserDataAndStores triggered.');
    fetchUserDataAndStores();
  }, [fetchUserDataAndStores]);

  const fetchCampaigns = useCallback(async () => {
    console.log('CampaignsPage: fetchCampaigns called. User:', user, 'ActiveStoreCreds:', activeStoreCreds);
    if (!user || !activeStoreCreds) {
      setCampaigns([]);
      setLoading(false);
      console.log('CampaignsPage: No user or activeStoreCreds, campaigns set to empty.');
      return;
    }
    setLoading(true);
    setError(null);
    console.log('CampaignsPage: Fetching campaigns for store:', activeStoreCreds.name, 'PerformanceCredsId:', activeStoreCreds.id);
    try {
      const response = await fetch('/api/ozon/performance/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: activeStoreCreds.ozon_client_id,
          clientSecret: activeStoreCreds.ozon_client_secret,
          userId: user.id,
          performanceCredentialsId: activeStoreCreds.id,
        }),
      });
      console.log('CampaignsPage: API response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        console.error('CampaignsPage: API error response data:', errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data: CombinedCampaignType[] = await response.json();
      console.log('CampaignsPage: Data received from API:', data);

      // Ensure all settings fields are initialized
      const processedCampaigns = data.map(campaign => ({
        ...campaign,
        userSettings: campaign.userSettings || {
          ozon_campaign_id: campaign.id, // Используем campaign.id из OzonCampaignData
          user_id: user.id,
          performance_credentials_id: activeStoreCreds.id,
          custom_daily_budget_limit: null,
          is_budget_control_enabled: false,
          app_controlled_status: 'USER_MANAGED',
          scheduling_enabled: false,
          schedule_start_time: null,
          schedule_end_time: null,
          schedule_days: [], // Инициализируем как пустой массив
          last_checked_at: null,
          cached_daily_spend: null,
          cached_ozon_status: campaign.state,
          last_daily_limit_pause_date: null,
        }
      }));
      console.log('CampaignsPage: Processed campaigns with initialized settings:', processedCampaigns);
      setCampaigns(processedCampaigns);
    } catch (err: any) {
      console.error('CampaignsPage: Error fetching campaigns:', err);
      setError(err.message);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeStoreCreds, supabase]);

  useEffect(() => {
    console.log('CampaignsPage: useEffect for fetchCampaigns triggered. User:', user, 'ActiveStoreCreds:', activeStoreCreds);
    if (user && activeStoreCreds) {
      fetchCampaigns();
    } else {
      // Clear campaigns if no user or active store
      setCampaigns([]);
      setLoading(false) // Ensure loading is false if there's nothing to load
      console.log('CampaignsPage: useEffect - No user or activeStoreCreds, clearing campaigns and stopping loading.');
    }
  }, [user, activeStoreCreds, fetchCampaigns]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !activeStoreCreds) {
      return;
    }

    const subscription = supabase
      .channel(`user_campaign_settings:user_id=eq.${user.id}:performance_credentials_id=eq.${activeStoreCreds.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_campaign_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload: RealtimePostgresChangesPayload<UserCampaignSettings>) => {
          console.log('CampaignsPage: Realtime update received:', payload.new);
          // Убедимся, что payload.new соответствует UserCampaignSettings
          const newSettings = payload.new as UserCampaignSettings;

          setCampaigns(prevCampaigns =>
            prevCampaigns.map(c => {
              if (c.userSettings && newSettings.id && c.userSettings.id === newSettings.id) {
                return { ...c, userSettings: { ...c.userSettings, ...newSettings } };
              }
              // Случай когда у нас еще нет c.userSettings.id (новая запись), но есть ozon_campaign_id
              if (c.userSettings && newSettings.ozon_campaign_id === c.userSettings.ozon_campaign_id && newSettings.performance_credentials_id === c.userSettings.performance_credentials_id) {
                 // Здесь, возможно, стоит полностью заменить userSettings на newSettings, 
                 // если newSettings содержит все необходимые поля, включая те, что не приходят с сервера (isDirty и т.д.)
                 // или аккуратно смержить, сохраняя локальные флаги.
                 // Пока что просто мержим.
                return { ...c, userSettings: { ...c.userSettings, ...newSettings } };
              }
              return c;
            })
          );
        }
      )
      .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to user_campaign_settings changes for store:', activeStoreCreds.id);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Supabase Realtime subscription error:', err || status);
          setError('Ошибка подписки на обновления в реальном времени.');
        }
      });

    return () => {
      console.log('Unsubscribing from user_campaign_settings changes for store:', activeStoreCreds.id);
      supabase.removeChannel(subscription);
    };
  }, [user, supabase, activeStoreCreds]);

  const handleSettingChange = (
    campaignOzonId: number, // ID кампании от Ozon
    field: keyof UserCampaignSettings,
    value: any
  ) => {
    setCampaigns(prevCampaigns =>
      prevCampaigns.map(c => {
        if (c.id === campaignOzonId) {
          let processedValue = value;
          if (field === 'custom_daily_budget_limit') {
            const numValue = parseFloat(value);
            processedValue = isNaN(numValue) || numValue < 0 ? null : numValue;
          }
          if (field === 'is_budget_control_enabled') {
            processedValue = typeof value === 'boolean' ? value : false;
          }
          return {
            ...c,
            userSettings: {
              ...(c.userSettings as UserCampaignSettings), // Добавляем явное приведение типа, если userSettings может быть неполным
              ozon_campaign_id: c.id, // Убедимся, что ozon_campaign_id всегда есть
              user_id: user!.id, // user не должен быть null на этом этапе
              performance_credentials_id: activeStoreCreds!.id, // activeStoreCreds не должен быть null
              [field]: processedValue,
              isDirty: true,
              saveError: null,
            } as UserCampaignSettings,
          };
        }
        return c;
      })
    );
  };

  const handleSaveSettings = async (campaignOzonId: number) => {
    const campaignToSave = campaigns.find(c => c.id === campaignOzonId);

    if (!campaignToSave || !campaignToSave.userSettings || !user || !activeStoreCreds) {
      console.error('CampaignsPage: Save prerequisites not met for campaignOzonId:', campaignOzonId, { campaignToSave, user, activeStoreCreds });
      // Обновляем состояние ошибки для конкретной кампании, если это еще не сделано
      setCampaigns(prev => prev.map(c => c.id === campaignOzonId ? { ...c, userSettings: { ...(c.userSettings as UserCampaignSettings), saveError: 'Ошибка: Недостаточно данных для сохранения.' } } : c));
      return;
    }

    // Установка состояния загрузки и сброс ошибки
    setCampaigns(prev => prev.map(c =>
      c.id === campaignOzonId
        ? { ...c, userSettings: { ...c.userSettings, isSaving: true, saveError: null } }
        : c
    ));

    const settingsToSave: UserCampaignSettings = {
      ...campaignToSave.userSettings,
      user_id: user.id, // Убедимся, что эти ID передаются
      ozon_campaign_id: campaignToSave.id,
      performance_credentials_id: activeStoreCreds.id,
    };
    
    // Удаляем клиентские поля перед отправкой на сервер
    delete settingsToSave.isDirty;
    delete settingsToSave.isSaving;
    delete settingsToSave.saveError;

    try {
      console.log('CampaignsPage: Saving settings for campaignOzonId:', campaignOzonId, 'Payload:', settingsToSave);
      const response = await fetch('/api/user-campaign-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response from server' }));
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
      }

      const savedSettings = await response.json(); // API должен вернуть сохраненные/обновленные настройки
      console.log('CampaignsPage: Settings saved successfully for campaignOzonId:', campaignOzonId, 'Response:', savedSettings);

      setCampaigns(prev => prev.map(c =>
        c.id === campaignOzonId
          ? {
              ...c,
              userSettings: {
                ...c.userSettings, // Сохраняем существующие, на случай если API не вернул все поля
                ...savedSettings.data, // Обновляем данными с сервера (API возвращает { data: UserCampaignSettings })
                isDirty: false,
                isSaving: false,
                saveError: null,
              } as UserCampaignSettings,
            }
          : c
      ));

    } catch (err: any) {
      console.error('CampaignsPage: Error saving campaign settings for campaignOzonId:', campaignOzonId, err);
      setCampaigns(prev => prev.map(c =>
        c.id === campaignOzonId
          ? { ...c, userSettings: { ...(c.userSettings as UserCampaignSettings), isSaving: false, saveError: err.message } }
          : c
      ));
    } 
  };

  console.log('CampaignsPage: Rendering. Loading:', loading, 'Error:', error, 'Campaigns count:', campaigns.length, 'Active store:', activeStoreCreds?.name, 'User ID:', user?.id);

  if (!user) {
    console.log('CampaignsPage: No user object, rendering AuthGuard with loading message.');
    return <div className="text-center p-8">Загрузка данных пользователя...</div>;
  }

  return (
    <AuthGuard>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Управление рекламными кампаниями Ozon</h1>

        {/* Выбор магазина */}
        <div className="mb-6">
          <label htmlFor="store-select" className="block text-sm font-medium text-gray-700 mb-1">
            Выберите магазин (Performance API):
          </label>
          <select
            id="store-select"
            value={activeStoreCreds?.id || ''}
            onChange={(e) => {
              const selectedStore = stores.find(s => s.id === e.target.value);
              setActiveStoreCreds(selectedStore || null);
            }}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
            disabled={stores.length === 0}
          >
            {stores.length === 0 && <option value="">Нет доступных магазинов с Performance API</option>}
            {stores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name} (Client ID: {store.ozon_client_id.substring(0,6)}...)
              </option>
            ))}
          </select>
        </div>

        {/* Сообщение о загрузке кампаний для выбранного магазина */}
        {loading && campaigns.length === 0 && activeStoreCreds && (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            Загрузка кампаний для магазина "{activeStoreCreds.name}"...
          </div>
        )}

        {/* Сообщение об ошибке при загрузке кампаний */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
            <strong className="font-bold">Ошибка!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        
        {/* Таблица кампаний */}
        {!loading && activeStoreCreds && campaigns.length === 0 && !error && (
           <div className="text-center p-8 bg-white rounded-lg shadow">
             <p className="text-gray-500">Нет кампаний для отображения для магазина "{activeStoreCreds.name}" или они еще не загружены.</p>
           </div>
        )}

        {activeStoreCreds && campaigns.length > 0 && (
          <div className="shadow overflow-x-auto border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название (ID)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус Ozon</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Контроль (Вкл/Выкл)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дневной лимит (Р)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                      <div className="text-xs text-gray-500">ID: {campaign.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ campaign.userSettings?.cached_ozon_status === 'CAMPAIGN_STATE_RUNNING' ? 'bg-green-100 text-green-800' : campaign.userSettings?.cached_ozon_status === 'CAMPAIGN_STATE_STOPPED' || campaign.userSettings?.cached_ozon_status === 'CAMPAIGN_STATE_INACTIVE' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800' }`}>
                        {campaign.userSettings?.cached_ozon_status || campaign.state}
                      </span>
                      {campaign.userSettings?.app_controlled_status && campaign.userSettings?.app_controlled_status !== 'USER_MANAGED' && (
                          <div className="text-xs text-blue-600 mt-1">App: {campaign.userSettings.app_controlled_status}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        checked={campaign.userSettings?.is_budget_control_enabled || false}
                        onChange={(e) => handleSettingChange(campaign.id, 'is_budget_control_enabled', e.target.checked)}
                        disabled={campaign.userSettings?.isSaving}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="number"
                        min="0"
                        className="w-32 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100"
                        value={campaign.userSettings?.custom_daily_budget_limit ?? ''} // Используем ?? '' для отображения пустого инпута если null
                        onChange={(e) => handleSettingChange(campaign.id, 'custom_daily_budget_limit', e.target.value)}
                        disabled={!campaign.userSettings?.is_budget_control_enabled || campaign.userSettings?.isSaving}
                        placeholder={!campaign.userSettings?.is_budget_control_enabled ? "-" : "Не задан"}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleSaveSettings(campaign.id)}
                        disabled={!campaign.userSettings?.isDirty || campaign.userSettings?.isSaving}
                        className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed px-3 py-1 rounded-md border border-transparent hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        {campaign.userSettings?.isSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                      {campaign.userSettings?.saveError && (
                        <p className="text-xs text-red-600 mt-1">{campaign.userSettings.saveError}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!activeStoreCreds && !loading && (
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <p className="text-gray-500">Пожалуйста, выберите магазин для отображения кампаний.</p>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default CampaignsPage; 