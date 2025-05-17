import { createClient } from '@supabase/supabase-js';

// ✅ Инициализация клиента Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

// Типы для настроек бюджета
export interface BudgetSettings {
  id?: string;
  user_id: string;
  daily_limit: number;
  notification_threshold: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Типы для мониторинга расходов
export interface BudgetSpending {
  date: string;
  campaign_id: string;
  campaign_name: string;
  spent: number;
  is_active: boolean;
}

// Получить настройки бюджета
export const getBudgetSettings = async (userId: string) => {
  const { data, error } = await supabase
    .from('budget_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 - запись не найдена
    return { data: null, error };
  }
  
  return { 
    data: data || { 
      user_id: userId, 
      daily_limit: 0, 
      notification_threshold: 80, 
      is_active: true 
    }, 
    error: null 
  };
};

// Сохранить настройки бюджета
export const updateBudgetSettings = async (userId: string, updatedSettings: Partial<BudgetSettings>) => {
  const settings = {
    user_id: userId,
    ...updatedSettings,
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('budget_settings')
    .upsert(settings)
    .select()
    .single();
  
  return { data, error };
};

// Сохранить данные о расходах кампании
export const saveCampaignSpending = async (userId: string, campaignId: string, campaignName: string, spent: number) => {
  const spending = {
    user_id: userId,
    campaign_id: campaignId,
    campaign_name: campaignName,
    spent,
    date: new Date().toISOString().split('T')[0], // Формат YYYY-MM-DD
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('campaign_spending')
    .upsert(spending, { onConflict: 'user_id,campaign_id,date' })
    .select();
  
  return { data, error };
};

// Получить расходы по кампаниям за сегодня
export const getTodaySpending = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0]; // Формат YYYY-MM-DD
  
  const { data, error } = await supabase
    .from('campaign_spending')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today);
  
  return { data, error };
};

// Обновить статус активности кампании
export const updateCampaignStatus = async (userId: string, campaignId: string, isActive: boolean) => {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ 
      status: isActive ? 'active' : 'paused',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('ozon_campaign_id', campaignId)
    .select();
  
  return { data, error };
};

// Получить все кампании пользователя
export const getUserCampaigns = async (userId: string) => {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', userId);
  
  return { data, error };
};

// Сохранить кампанию
export const saveCampaign = async (userId: string, campaignData: any) => {
  const campaign = {
    user_id: userId,
    ozon_campaign_id: campaignData.id,
    name: campaignData.name,
    status: campaignData.state,
    daily_budget: campaignData.dailyBudget || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('campaigns')
    .upsert(campaign, { onConflict: 'user_id,ozon_campaign_id' })
    .select();
  
  return { data, error };
};
