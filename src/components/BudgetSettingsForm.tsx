"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { getCampaignsList, updateCampaignBudget, OzonCredentials } from '@/lib/ozonApi';
import { getBudgetSettings, updateBudgetSettings } from '@/lib/supabase';
import BudgetMonitor from './BudgetMonitor';

interface BudgetSettingsFormProps {
  userId: string;
  credentials: OzonCredentials;
}

interface FormValues {
  dailyLimit: number;
  notificationThreshold: number;
  isActive: boolean;
  campaignId: string;
  campaignBudget: number;
}

const BudgetSettingsForm: React.FC<BudgetSettingsFormProps> = ({ userId, credentials }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [storeId, setStoreId] = useState<string>('default'); // Значение по умолчанию для storeId
  const [performanceCredentials, setPerformanceCredentials] = useState<{
    clientId: string;
    apiKey: string;
  }>({
    clientId: credentials.clientId, // Используем те же учетные данные по умолчанию
    apiKey: credentials.apiKey
  });
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>();
  const isActiveValue = watch('isActive');
  const dailyLimitValue = watch('dailyLimit') || 0;
  const notificationThresholdValue = watch('notificationThreshold') || 80;
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      const { data: campaignsData, error: campaignsError } = await getCampaignsList(credentials);
      if (campaignsError) {
        setMessage('Ошибка при загрузке кампаний: ' + (campaignsError as Error).message);
      } else if (campaignsData) {
        setCampaigns(campaignsData.campaigns || []);
      }
      
      const { data: budgetData, error: budgetError } = await getBudgetSettings(userId);
      if (budgetError) {
        setMessage('Ошибка при загрузке настроек бюджета: ' + (budgetError as Error).message);
      } else if (budgetData) {
        setValue('dailyLimit', budgetData.daily_limit || 0);
        setValue('notificationThreshold', budgetData.notification_threshold || 80);
        setValue('isActive', budgetData.is_active !== undefined ? budgetData.is_active : true);
        
        // Если в настройках есть storeId, используем его
        if (budgetData.store_id) {
          setStoreId(budgetData.store_id);
        }
        
        // Если в настройках есть данные Performance API, используем их
        if (budgetData.performance_client_id && budgetData.performance_api_key) {
          setPerformanceCredentials({
            clientId: budgetData.performance_client_id,
            apiKey: budgetData.performance_api_key
          });
        }
      }
      
      setLoading(false);
    };
    
    loadData();
  }, [userId, credentials, setValue]);
  
  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaign(campaignId);
    const campaign = campaigns.find(c => c.id === campaignId);
    if (campaign) {
      setValue('campaignBudget', campaign.dailyBudget || 0);
    }
  };
  
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setMessage('');
    
    try {
      const { error: budgetError } = await updateBudgetSettings(userId, {
        daily_limit: data.dailyLimit,
        notification_threshold: data.notificationThreshold,
        is_active: data.isActive,
        store_id: storeId,
        performance_client_id: performanceCredentials.clientId,
        performance_api_key: performanceCredentials.apiKey
      });
      
      if (budgetError) {
        throw new Error('Ошибка при обновлении настроек бюджета: ' + (budgetError as Error).message);
      }
      
      if (selectedCampaign) {
        const { error: campaignError } = await updateCampaignBudget(
          credentials,
          selectedCampaign,
          data.campaignBudget
        );
        
        if (campaignError) {
          throw new Error('Ошибка при обновлении бюджета кампании: ' + (campaignError as Error).message);
        }
      }
      
      setMessage('Настройки бюджета успешно обновлены');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-6">Настройки бюджета</h2>
          
          {message && (
            <div className={`p-4 mb-4 rounded ${message.includes('Ошибка') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {message}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Общий дневной лимит (руб.)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md"
                {...register('dailyLimit', { 
                  required: 'Это поле обязательно', 
                  min: { value: 0, message: 'Значение должно быть положительным' } 
                })}
              />
              {errors.dailyLimit && <p className="text-red-500 mt-1">{errors.dailyLimit.message}</p>}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Порог уведомления (%)</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-md"
                {...register('notificationThreshold', { 
                  required: 'Это поле обязательно', 
                  min: { value: 1, message: 'Минимальное значение 1%' }, 
                  max: { value: 100, message: 'Максимальное значение 100%' } 
                })}
              />
              {errors.notificationThreshold && <p className="text-red-500 mt-1">{errors.notificationThreshold.message}</p>}
            </div>
            
            <div className="mb-4">
              <label className="flex items-center text-gray-700 mb-2">
                <input
                  type="checkbox"
                  className="mr-2"
                  {...register('isActive')}
                />
                Автоматически отключать кампании при превышении лимита
              </label>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Выберите кампанию для настройки бюджета</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                onChange={(e) => handleCampaignSelect(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Выберите кампанию</option>
                {campaigns.map(campaign => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name} ({campaign.state === 'active' ? 'активна' : 'приостановлена'})
                  </option>
                ))}
              </select>
            </div>
            
            {selectedCampaign && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Дневной бюджет кампании (руб.)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-md"
                  {...register('campaignBudget', { 
                    required: 'Это поле обязательно', 
                    min: { value: 0, message: 'Значение должно быть положительным' } 
                  })}
                />
                {errors.campaignBudget && <p className="text-red-500 mt-1">{errors.campaignBudget.message}</p>}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Сохранить настройки'}
            </button>
            
            <button
              type="button"
              className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-md"
              onClick={() => setShowMonitor(!showMonitor)}
            >
              {showMonitor ? 'Скрыть мониторинг' : 'Показать мониторинг'}
            </button>
          </form>
        </div>
        
        {showMonitor && (
          <div>
            <BudgetMonitor 
              userId={userId} 
              storeId={storeId}
              credentials={credentials}
              performanceCredentials={performanceCredentials}
              dailyLimit={dailyLimitValue}
              warningThreshold={notificationThresholdValue}
              autoDisable={isActiveValue}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetSettingsForm;
