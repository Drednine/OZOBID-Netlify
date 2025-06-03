'use client';

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation'; // Добавим useRouter
import { supabase } from '@/lib/supabase'; // Прямой импорт supabase
import AuthGuard from '@/components/AuthGuard'; // Импорт AuthGuard
import { OzonPerformanceCredentials } from '@/lib/types/ozon'; // Обновленный путь к типу

// Интерфейсы, скопированные или адаптированные из API маршрута
interface OzonCampaignData {
  id: number;
  title: string;
  state: string;
  budget: number;
  dailyBudget: number;
  // ... другие поля от Ozon
}

interface UserCampaignSettingData {
  id?: string; // id из нашей БД, может отсутствовать для новых настроек
  ozon_campaign_id: number;
  performance_credentials_id?: string; // Будет установлено при сохранении
  user_id?: string; // Будет установлено при сохранении
  custom_daily_budget_limit: number | null;
  is_budget_control_enabled: boolean;
  app_controlled_status: string | null;
  // Добавим поля для отслеживания изменений и сохранения
  isDirty?: boolean; // Флаг, что настройки были изменены
  saveError?: string | null; // Ошибка сохранения для конкретной строки
  isSaving?: boolean; // Флаг, что строка сохраняется
  scheduling_enabled: boolean;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  schedule_days: string | null;
  last_checked_at: string | null;
  last_daily_limit_pause_date: string | null;
  cached_daily_spend: number | null;
  cached_ozon_status: string | null;
}

interface CombinedCampaign extends OzonCampaignData {
  userSettings: UserCampaignSettingData; // Теперь userSettings всегда будет объектом
}

const CampaignsPage = () => {
  const router = useRouter(); // useRouter
  const [user, setUser] = useState<any>(null); // Состояние для пользователя
  const [allStores, setAllStores] = useState<OzonPerformanceCredentials[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CombinedCampaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Изначально true для загрузки пользователя
  const [error, setError] = useState<string | null>(null);

  // 1. Загрузка пользователя при монтировании
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        router.push('/auth/login');
        return;
      }
      setUser(currentUser);
    };
    fetchUser();
  }, [router]);

  // 2. Загрузка магазинов (Performance API credentials) пользователя
  const loadStores = useCallback(async () => {
    if (!user) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('ozon_performance_credentials')
        .select('*')
        .eq('user_id', user.id);
      if (dbError) throw dbError;
      if (Array.isArray(data)) {
        setAllStores(data);
        if (data.length > 0 && !activeStoreId) {
          setActiveStoreId(data[0].id);
        }
      } else {
        setAllStores([]);
      }
    } catch (err: any) {
      console.error("Error loading performance stores:", err);
      setError("Ошибка загрузки магазинов Performance API.");
      setAllStores([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeStoreId]);

  useEffect(() => {
    if (user) {
      loadStores();
    }
  }, [user, loadStores]);

  // 3. Загрузка кампаний для активного магазина
  const fetchCampaigns = useCallback(async () => {
    if (!user || !activeStoreId) {
      setCampaigns([]);
      return;
    }
    const activeStore = allStores.find(store => store.id === activeStoreId);
    if (!activeStore || !activeStore.ozon_client_id || !activeStore.ozon_client_secret) {
      setError("Учетные данные Performance API для выбранного магазина не найдены или неполны.");
      setCampaigns([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post<OzonCampaignData[]>('/api/ozon/performance/campaigns', {
        clientId: activeStore.ozon_client_id,
        clientSecret: activeStore.ozon_client_secret,
        userId: user.id,
        performanceCredentialsId: activeStore.id,
      });
      
      const processedCampaigns = response.data.map((campaignWithPotentialSettings: any) => {
        const ozonData = campaignWithPotentialSettings;
        const existingSettings = campaignWithPotentialSettings.userSettings;
        return {
          ...ozonData,
          userSettings: {
            id: existingSettings?.id,
            ozon_campaign_id: ozonData.id,
            performance_credentials_id: activeStore.id,
            user_id: user.id,
            custom_daily_budget_limit: existingSettings?.custom_daily_budget_limit ?? null,
            is_budget_control_enabled: existingSettings?.is_budget_control_enabled ?? false,
            app_controlled_status: existingSettings?.app_controlled_status ?? 'USER_MANAGED',
            scheduling_enabled: existingSettings?.scheduling_enabled ?? false,
            schedule_start_time: existingSettings?.schedule_start_time ?? null,
            schedule_end_time: existingSettings?.schedule_end_time ?? null,
            schedule_days: existingSettings?.schedule_days ?? null,
            last_checked_at: existingSettings?.last_checked_at ?? null,
            last_daily_limit_pause_date: existingSettings?.last_daily_limit_pause_date ?? null,
            cached_daily_spend: existingSettings?.cached_daily_spend ?? null,
            cached_ozon_status: existingSettings?.cached_ozon_status ?? null,
            isDirty: false,
            saveError: null,
            isSaving: false,
          } as UserCampaignSettingData,
        };
      });
      setCampaigns(processedCampaigns as CombinedCampaign[]);
    } catch (err: any) {
      console.error("Error fetching campaigns:", err);
      setError(err.response?.data?.error || "Ошибка загрузки кампаний.");
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeStoreId, allStores]);

  useEffect(() => {
    if (user && activeStoreId) {
      setCampaigns([]);
      fetchCampaigns();
    }
  }, [user, activeStoreId, fetchCampaigns]);

  // === Supabase Realtime Subscription ===
  useEffect(() => {
    if (!user || !activeStoreId) {
      return;
    }

    const subscription = supabase
      .channel(`user_campaign_settings:user_id=eq.${user.id}:performance_credentials_id=eq.${activeStoreId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_campaign_settings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Supabase Realtime: Campaign setting UPDATE received:', payload);
          const updatedSetting = payload.new as UserCampaignSettingData;
          
          if (updatedSetting.performance_credentials_id !== activeStoreId) {
            console.log('Realtime update skipped: performance_credentials_id does not match active store.');
            return;
          }

          setCampaigns((prevCampaigns) =>
            prevCampaigns.map((campaign) =>
              campaign.userSettings.ozon_campaign_id === updatedSetting.ozon_campaign_id
                ? {
                    ...campaign,
                    userSettings: {
                        ...campaign.userSettings,
                        ...updatedSetting,
                        isDirty: campaign.userSettings.isDirty,
                        isSaving: campaign.userSettings.isSaving,
                        saveError: campaign.userSettings.saveError,
                    } as UserCampaignSettingData,
                  }
                : campaign
            )
          );
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to user_campaign_settings changes for store:', activeStoreId);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Supabase Realtime subscription error:', err || status);
          setError('Ошибка подписки на обновления в реальном времени.');
        }
      });

    return () => {
      console.log('Unsubscribing from user_campaign_settings changes for store:', activeStoreId);
      supabase.removeChannel(subscription);
    };
  }, [user, activeStoreId]);

  const handleStoreChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setActiveStoreId(event.target.value);
  };

  // Обработчик изменения настроек кампании
  const handleSettingChange = (ozonCampaignId: number, field: keyof UserCampaignSettingData, value: any) => {
    setCampaigns(prevCampaigns =>
      prevCampaigns.map(campaign =>
        campaign.id === ozonCampaignId
          ? {
              ...campaign,
              userSettings: {
                ...campaign.userSettings,
                [field]: value,
                isDirty: true,
              },
            }
          : campaign
      )
    );
  };

  // Обработчик сохранения настроек для одной кампании
  const handleSaveSettings = async (ozonCampaignId: number) => {
    const campaignToSave = campaigns.find(c => c.id === ozonCampaignId);
    if (!campaignToSave || !campaignToSave.userSettings.isDirty) return;

    setCampaigns(prev => prev.map(c => c.id === ozonCampaignId ? { ...c, userSettings: {...c.userSettings, isSaving: true, saveError: null} } : c));

    try {
      const response = await axios.post('/api/user-campaign-settings', campaignToSave.userSettings);
      const savedSettings = response.data; 
      if (!savedSettings) {
        throw new Error('Ответ сервера не содержит данных о сохраненных настройках.');
      }
      setCampaigns(prev =>
        prev.map(c =>
          c.id === ozonCampaignId
            ? {
                ...c,
                userSettings: {
                  ...savedSettings,
                  isDirty: false,
                  isSaving: false,
                  saveError: null,
                },
              }
            : c
        )
      );
    } catch (err: any) {
      console.error('Error saving campaign settings for ID:', ozonCampaignId, err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Неизвестная ошибка';
      setCampaigns(prev => prev.map(c => c.id === ozonCampaignId ? { ...c, userSettings: {...c.userSettings, isSaving: false, saveError: errorMessage } } : c));
    }
  };

  // Отображение главного лоадера, пока пользователь не загружен
  if (!user && loading) { 
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Управление рекламными кампаниями Ozon</h1>

        {/* Выбор магазина */}
        <div className="mb-4">
          <label htmlFor="storeSelect" className="block text-sm font-medium text-gray-700 mb-1">
            Выберите магазин (Performance API):
          </label>
          <select
            id="storeSelect"
            value={activeStoreId || ''}
            onChange={handleStoreChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            disabled={allStores.length === 0 || loading}
          >
            {allStores.length === 0 && <option value="">Нет доступных магазинов Performance API</option>}
            {allStores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} (Client ID: {store.ozon_client_id.substring(0, 6)}...)
              </option>
            ))}
          </select>
        </div>

        {loading && <p>Загрузка данных...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && campaigns.length === 0 && activeStoreId && (
          <p>Для выбранного магазина нет рекламных кампаний или не удалось их загрузить.</p>
        )}

        {campaigns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Название (ID)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус Ozon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Контроль (Вкл/Выкл)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дневной лимит (₽)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус (наш)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Расход сегодня (кэш)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{campaign.title}</div>
                      <div className="text-xs text-gray-500">ID: {campaign.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{campaign.userSettings.cached_ozon_status || campaign.state}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        className="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
                        checked={campaign.userSettings.is_budget_control_enabled}
                        onChange={(e) => handleSettingChange(campaign.id, 'is_budget_control_enabled', e.target.checked)}
                        disabled={campaign.userSettings.isSaving}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="number"
                        className="form-input block w-full sm:text-sm sm:leading-5 rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-100"
                        value={campaign.userSettings.custom_daily_budget_limit === null || campaign.userSettings.custom_daily_budget_limit === undefined ? '' : campaign.userSettings.custom_daily_budget_limit}
                        onChange={(e) => handleSettingChange(campaign.id, 'custom_daily_budget_limit', e.target.value === '' ? null : parseFloat(e.target.value))}
                        placeholder="Не задан"
                        disabled={!campaign.userSettings.is_budget_control_enabled || campaign.userSettings.isSaving}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.userSettings.app_controlled_status || 'Не управляется'}
                      {campaign.userSettings.saveError && <div className="text-xs text-red-500">Ошибка: {campaign.userSettings.saveError}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.userSettings.cached_daily_spend?.toLocaleString() ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleSaveSettings(campaign.id)}
                        disabled={!campaign.userSettings.isDirty || campaign.userSettings.isSaving}
                        className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        {campaign.userSettings.isSaving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default CampaignsPage; 