"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { checkAndDisableCampaignsIfBudgetExceeded } from '@/lib/ozonApi';

interface BudgetMonitorProps {
  userId: string;
  storeId: string;
  credentials: {
    clientId: string;
    apiKey: string;
  };
  performanceCredentials: {
    clientId: string;
    apiKey: string;
  };
  dailyLimit: number;
  warningThreshold: number;
  autoDisable: boolean;
  onBudgetExceeded?: () => void;
}

const BudgetMonitor: React.FC<BudgetMonitorProps> = ({
  userId,
  storeId,
  credentials,
  performanceCredentials,
  dailyLimit,
  warningThreshold,
  autoDisable,
  onBudgetExceeded
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);
  const [percentSpent, setPercentSpent] = useState(0);
  const [isWarning, setIsWarning] = useState(false);
  const [isExceeded, setIsExceeded] = useState(false);
  const [campaignsDisabled, setCampaignsDisabled] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [campaignSpending, setCampaignSpending] = useState<Record<string, any>>({});

  // Функция для проверки бюджета
  const checkBudget = async () => {
    setLoading(true);
    setError(null);

    try {
      // Проверка и отключение кампаний при превышении бюджета
      const { data, error } = await checkAndDisableCampaignsIfBudgetExceeded(
        credentials,
        performanceCredentials,
        dailyLimit,
        autoDisable
      );

      if (error) {
        throw new Error(error);
      }

      // Обновление состояния
      setTotalSpent(data.totalSpent);
      setPercentSpent((data.totalSpent / dailyLimit) * 100);
      setIsWarning(data.totalSpent >= (dailyLimit * warningThreshold / 100));
      setIsExceeded(data.budgetExceeded);
      setCampaignsDisabled(data.campaignsDisabled || 0);
      setCampaignSpending(data.campaignSpending || {});
      setLastUpdated(new Date());

      // Сохранение данных в Supabase
      await supabase
        .from('budget_history')
        .insert({
          user_id: userId,
          store_id: storeId,
          date: new Date().toISOString().split('T')[0],
          total_spent: data.totalSpent,
          campaigns_disabled: data.budgetExceeded && autoDisable,
          created_at: new Date().toISOString()
        });

      // Вызов колбэка при превышении бюджета
      if (data.budgetExceeded && onBudgetExceeded) {
        onBudgetExceeded();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Проверка бюджета при монтировании компонента и каждые 30 минут
  useEffect(() => {
    checkBudget();
    
    const interval = setInterval(() => {
      checkBudget();
    }, 30 * 60 * 1000); // 30 минут
    
    return () => clearInterval(interval);
  }, [dailyLimit, warningThreshold, autoDisable]);

  // Определение цвета индикатора
  const getStatusColor = () => {
    if (isExceeded) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className='bg-white rounded-lg shadow p-6 mb-6'>
      <h2 className='text-xl font-semibold mb-4'>Мониторинг дневного бюджета</h2>
      
      {error && (
        <div className='bg-red-100 text-red-700 p-4 rounded-md mb-4'>
          {error}
        </div>
      )}
      
      <div className='flex items-center mb-4'>
        <div className={'w-3 h-3 rounded-full ' + getStatusColor() + ' mr-2'}></div>
        <span className='font-medium'>
          {isExceeded ? 'Бюджет превышен' : isWarning ? 'Приближение к лимиту' : 'В пределах бюджета'}
        </span>
      </div>
      
      <div className='mb-4'>
        <div className='flex justify-between mb-1'>
          <span>Расходы: {totalSpent.toFixed(2)} ₽ из {dailyLimit.toFixed(2)} ₽</span>
          <span>{percentSpent.toFixed(1)}%</span>
        </div>
        <div className='w-full bg-gray-200 rounded-full h-2.5'>
          <div 
            className={'h-2.5 rounded-full ' + getStatusColor()} 
            style={{ width: Math.min(percentSpent, 100) + '%' }}
          ></div>
        </div>
      </div>
      
      {isExceeded && autoDisable && (
        <div className='bg-red-50 text-red-700 p-3 rounded-md mb-4'>
          <p>Автоматически отключено кампаний: {campaignsDisabled}</p>
        </div>
      )}
      
      {Object.keys(campaignSpending).length > 0 && (
        <div className='mt-4'>
          <h3 className='font-medium mb-2'>Расходы по кампаниям:</h3>
          <div className='max-h-40 overflow-y-auto'>
            {Object.values(campaignSpending).map((campaign: any) => (
              <div key={campaign.id} className='flex justify-between py-1 border-b border-gray-100'>
                <span className='truncate mr-2' title={campaign.name}>
                  {campaign.name}
                </span>
                <span className='font-medium'>{campaign.spent.toFixed(2)} ₽</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className='mt-4 text-sm text-gray-500 flex justify-between'>
        <button 
          onClick={checkBudget} 
          disabled={loading}
          className='text-blue-500 hover:text-blue-700'
        >
          {loading ? 'Обновление...' : 'Обновить данные'}
        </button>
        {lastUpdated && (
          <span>
            Обновлено: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default BudgetMonitor;