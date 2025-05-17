"use client";

import React, { useState, useEffect } from 'react';
import { OzonCredentials } from '@/lib/ozonApi';
import { getCampaignsStatistics, getCampaignsList, updateCampaignStatus } from '@/lib/ozonApi';
import { getBudgetSettings, getTodaySpending, updateCampaignStatus as updateDbCampaignStatus } from '@/lib/supabase';

interface BudgetMonitorProps {
  userId: string;
  credentials: OzonCredentials;
}

const BudgetMonitor: React.FC<BudgetMonitorProps> = ({ userId, credentials }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success');
  const [budgetSettings, setBudgetSettings] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [todaySpending, setTodaySpending] = useState<number>(0);
  const [spendingPercentage, setSpendingPercentage] = useState<number>(0);
  const [lastChecked, setLastChecked] = useState<string>('');

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    loadData();
  }, [userId, credentials]);

  // Функция загрузки всех необходимых данных
  const loadData = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      // Загрузка настроек бюджета
      const { data: budgetData, error: budgetError } = await getBudgetSettings(userId);
      if (budgetError) {
        throw new Error('Ошибка при загрузке настроек бюджета: ' + budgetError.message);
      }
      setBudgetSettings(budgetData);
      
      // Загрузка списка кампаний
      const { data: campaignsData, error: campaignsError } = await getCampaignsList(credentials);
      if (campaignsError) {
        throw new Error('Ошибка при загрузке списка кампаний: ' + campaignsError.message);
      }
      setCampaigns(campaignsData?.campaigns || []);
      
      // Получение статистики расходов за сегодня
      await checkSpending();
      
      setLastChecked(new Date().toLocaleTimeString());
    } catch (error) {
      setMessage((error as Error).message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  // Проверка текущих расходов
  const checkSpending = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Получение статистики расходов
      const { data: statsData, error: statsError } = await getCampaignsStatistics(
        credentials,
        today,
        today
      );
      
      if (statsError) {
        throw new Error('Ошибка при получении статистики расходов: ' + statsError.message);
      }
      
      // Расчет общих расходов за сегодня
      let totalSpent = 0;
      if (statsData && statsData.statistics) {
        statsData.statistics.forEach((stat: any) => {
          totalSpent += parseFloat(stat.spent || 0);
        });
      }
      
      setTodaySpending(totalSpent);
      
      // Расчет процента от дневного лимита
      if (budgetSettings && budgetSettings.daily_limit > 0) {
        const percentage = (totalSpent / budgetSettings.daily_limit) * 100;
        setSpendingPercentage(percentage);
        
        // Проверка превышения порога уведомления
        if (percentage >= budgetSettings.notification_threshold && percentage < 100) {
          setMessage(`Внимание! Расходы достигли ${percentage.toFixed(1)}% от дневного лимита.`);
          setMessageType('warning');
        }
        
        // Проверка превышения дневного лимита
        if (percentage >= 100) {
          setMessage(`Превышен дневной лимит расходов! Расходы составляют ${percentage.toFixed(1)}% от лимита.`);
          setMessageType('error');
          
          // Автоматическое отключение кампаний при превышении лимита
          if (budgetSettings.is_active) {
            await pauseAllCampaigns();
          }
        }
      }
      
      setLastChecked(new Date().toLocaleTimeString());
    } catch (error) {
      setMessage((error as Error).message);
      setMessageType('error');
    }
  };

  // Приостановка всех активных кампаний
  const pauseAllCampaigns = async () => {
    try {
      const activeCampaigns = campaigns.filter(campaign => campaign.state === 'active');
      
      if (activeCampaigns.length === 0) {
        return;
      }
      
      for (const campaign of activeCampaigns) {
        // Обновление статуса в OZON API
        const { error: apiError } = await updateCampaignStatus(
          credentials,
          campaign.id,
          'paused'
        );
        
        if (apiError) {
          console.error(`Ошибка при приостановке кампании ${campaign.id}: ${apiError}`);
          continue;
        }
        
        // Обновление статуса в базе данных
        await updateDbCampaignStatus(userId, campaign.id, false);
      }
      
      // Обновление списка кампаний после изменения статусов
      const { data: updatedCampaigns, error: campaignsError } = await getCampaignsList(credentials);
      if (!campaignsError && updatedCampaigns) {
        setCampaigns(updatedCampaigns.campaigns || []);
      }
      
      setMessage(`Автоматически приостановлено ${activeCampaigns.length} кампаний из-за превышения дневного лимита.`);
      setMessageType('warning');
    } catch (error) {
      console.error('Ошибка при приостановке кампаний:', error);
    }
  };

  // Форматирование денежной суммы
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Мониторинг дневного бюджета</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${
          messageType === 'error' ? 'bg-red-100 text-red-700' : 
          messageType === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
          'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="font-medium">Дневной лимит:</span>
          <span>{budgetSettings ? formatCurrency(budgetSettings.daily_limit) : 'Не установлен'}</span>
        </div>
        
        <div className="flex justify-between mb-2">
          <span className="font-medium">Расходы сегодня:</span>
          <span>{formatCurrency(todaySpending)}</span>
        </div>
        
        <div className="flex justify-between mb-2">
          <span className="font-medium">Порог уведомления:</span>
          <span>{budgetSettings ? `${budgetSettings.notification_threshold}%` : 'Не установлен'}</span>
        </div>
        
        <div className="flex justify-between mb-2">
          <span className="font-medium">Автоотключение кампаний:</span>
          <span>{budgetSettings && budgetSettings.is_active ? 'Включено' : 'Отключено'}</span>
        </div>
        
        <div className="flex justify-between mb-2">
          <span className="font-medium">Последняя проверка:</span>
          <span>{lastChecked || 'Нет данных'}</span>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className={`h-4 rounded-full ${
              spendingPercentage >= 100 ? 'bg-red-500' : 
              spendingPercentage >= budgetSettings?.notification_threshold ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(spendingPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="text-right text-sm mt-1">
          {spendingPercentage.toFixed(1)}% от дневного лимита
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={loadData}
          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Обновить данные'}
        </button>
        
        <button
          onClick={checkSpending}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          disabled={loading}
        >
          Проверить расходы
        </button>
      </div>
    </div>
  );
};

export default BudgetMonitor;
