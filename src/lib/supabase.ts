import { createClient } from '@supabase/supabase-js';

// ✅ Инициализация клиента Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);

// 🔧 Заглушка — получить настройки бюджета
export const getBudgetSettings = async (userId: string) => {
  // Можно заменить на запрос из Supabase:
  // const { data, error } = await supabase.from('budget_settings').select('*').eq('user_id', userId);
  return {
    data: {
      campaignBudgets: [
        { campaignId: 'cmp123', budget: 5000 },
        { campaignId: 'cmp456', budget: 10000 }
      ]
    },
    error: null
  };
};

// 🔧 Заглушка — сохранить настройки бюджета
export const updateBudgetSettings = async (userId: string, updatedSettings: any) => {
  // Можно заменить на insert/update в Supabase:
  // await supabase.from('budget_settings').upsert({ user_id: userId, ...updatedSettings });
  console.log(`Saving settings for ${userId}:`, updatedSettings);
  return {
    data: { success: true },
    error: null
  };
};
