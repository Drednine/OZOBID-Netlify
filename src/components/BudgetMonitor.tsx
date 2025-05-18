"use client";

import React, { useState, useEffect } from 'react';
import { getBudgetSettings } from '@/lib/supabase';
import { getCampaignsList, OzonCredentials } from '@/lib/ozonApi';

interface BudgetMonitorProps {
  userId: string;
  credentials: OzonCredentials;
}

const BudgetMonitor: React.FC<BudgetMonitorProps> = ({ userId, credentials }) => {
  const [budgetSettings, setBudgetSettings] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data: budgetData, error: budgetError } = await getBudgetSettings(userId);
      if (budgetError) {
        throw new Error('Ошибка при загрузке настроек бюджета: ' + (budgetError as Error).message);
      }
      setBudgetSettings(budgetData);

      const { data: campaignsData, error: campaignsError } = await getCampaignsList(credentials);
      if (campaignsError) {
        throw new Error('Ошибка при загрузке списка кампаний: ' + (campaignsError as Error).message);
      }
      setCampaigns(campaignsData?.campaigns || []);

      await checkSpending();
      setLastChecked(new Date().toLocaleTimeString());
    } catch (error) {
      setMessage((error as Error).message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const checkSpending = async () => {
    if (!budgetSettings || !budgetSettings.campaignBudgets) return;

    const alerts = budgetSettings.campaignBudgets
      .map((budget: any) => {
        const campaign = campaigns.find((c) => c.id === budget.campaignId);
        if (!campaign) return null;

        const spent = campaign.spent || 0;
        const remaining = budget.budget - spent;
        const threshold = budget.notificationThreshold || 0.1;

        if (remaining < budget.budget * threshold) {
          return `Кампания "${campaign.name}" приближается к лимиту бюджета. Осталось: ${remaining}`;
        }

        return null;
      })
      .filter(Boolean);

    if (alerts.length > 0) {
      setMessage(alerts.join('\n'));
      setMessageType('error');
    } else {
      setMessage('Бюджеты в норме.');
      setMessageType('success');
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-md">
      <h2 className="text-xl font-semibold mb-4">Мониторинг бюджета</h2>

      {loading && <p>Загрузка...</p>}

      {message && (
        <div
          className={`p-3 rounded mb-4 ${
            messageType === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {message.split('\n').map((msg, idx) => (
            <p key={idx}>{msg}</p>
          ))}
        </div>
      )}

      <button
        onClick={loadData}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Повторная проверка
      </button>

      {lastChecked && (
        <p className="text-sm text-gray-500 mt-2">Последняя проверка: {lastChecked}</p>
      )}
    </div>
  );
};

export default BudgetMonitor;
