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

interface BudgetData {
  totalSpent: number;
  budgetExceeded: boolean;
  lastChecked: string;
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
  const [totalSpent, setTotalSpent] = useState(0);
  const [percentSpent, setPercentSpent] = useState(0);
  const [isWarning, setIsWarning] = useState(false);
  const [isExceeded, setIsExceeded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Функция для проверки бюджета
  const checkBudget = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Получение данных о расходах из базы данных
      const { data: budgetData, error: fetchError } = await supabase
        .from('budget_monitoring')
        .select('*')
        .eq('user_id', userId)
        .eq('store_id', storeId)
        .single();
      
      if (fetchError) {
        throw new Error(fetchError.message);
      }
      
      // Проверка и отключение кампаний, если бюджет превышен
      if (autoDisable) {
        const { data, error: checkError } = await checkAndDisableCampaignsIfBudgetExceeded({
          clientId: performanceCredentials.clientId,
          apiKey: performanceCredentials.apiKey
        }, dailyLimit);
        
        if (checkError) {
          throw new Error(checkError.message);
        }
        
        // Обновление состояния
        if (data) {
          setTotalSpent(data.totalSpent || 0);
          setPercentSpent(((data.totalSpent || 0) / dailyLimit) * 100);
          setIsWarning((data.totalSpent || 0) >= (dailyLimit * warningThreshold / 100));
          setIsExceeded(data.budgetExceeded || false);
          setLastChecked(new Date().toISOString());
          
          // Вызов колбэка, если бюджет превышен
          if (data.budgetExceeded && onBudgetExceeded) {
            onBudgetExceeded();
          }
          
          // Обновление данных в базе
          await supabase
            .from('budget_monitoring')
            .upsert({
              user_id: userId,
              store_id: storeId,
              total_spent: data.totalSpent || 0,
              budget_exceeded: data.budgetExceeded || false,
              last_checked: new Date().toISOString()
            });
        }
      } else {
        // Если автоотключение не включено, просто обновляем состояние из базы
        if (budgetData) {
          setTotalSpent(budgetData.total_spent || 0);
          setPercentSpent(((budgetData.total_spent || 0) / dailyLimit) * 100);
          setIsWarning((budgetData.total_spent || 0) >= (dailyLimit * warningThreshold / 100));
          setIsExceeded(budgetData.budget_exceeded || false);
          setLastChecked(budgetData.last_checked);
        }
      }
    } catch (err) {
      setError(`Ошибка при проверке бюджета: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Проверка бюджета при монтировании компонента
  useEffect(() => {
    checkBudget();
    
    // Проверка бюджета каждые 30 минут
    const interval = setInterval(checkBudget, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userId, storeId, dailyLimit, warningThreshold, autoDisable]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Мониторинг дневного бюджета</h2>
      
      {error && (
        <div className="p-4 mb-4 rounded bg-red-100 text-red-700">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Потрачено: {totalSpent.toFixed(2)} ₽ из {dailyLimit.toFixed(2)} ₽
          </span>
          <span className="text-sm font-medium text-gray-700">
            {percentSpent.toFixed(1)}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${
              isExceeded ? 'bg-red-600' : isWarning ? 'bg-yellow-500' : 'bg-green-600'
            }`} 
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          ></div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <div className="mb-4 md:mb-0">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isExceeded ? 'bg-red-100 text-red-800' : 
            isWarning ? 'bg-yellow-100 text-yellow-800' : 
            'bg-green-100 text-green-800'
          }`}>
            {isExceeded ? 'Бюджет превышен' : 
             isWarning ? 'Приближается к лимиту' : 
             'В пределах бюджета'}
          </span>
        </div>
        
        <div className="text-sm text-gray-500">
          {lastChecked && `Последняя проверка: ${new Date(lastChecked).toLocaleString()}`}
        </div>
      </div>
      
      <button
        onClick={checkBudget}
        disabled={loading}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-200 disabled:opacity-50"
      >
        {loading ? 'Проверка...' : 'Проверить сейчас'}
      </button>
    </div>
  );
};

export default BudgetMonitor;
