import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Инициализация Supabase клиента (используйте переменные окружения)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface OzonCampaign {
  id: number;
  title: string;
  state: string; // e.g., CAMPAIGN_STATE_RUNNING, CAMPAIGN_STATE_STOPPED, etc.
  budget: number;
  dailyBudget: number;
  paymentType: string;
  advObjectType: string; // e.g., ADV_OBJECT_TYPE_PRODUCT_SKU
  placement: string[];   // e.g., ["PLACEMENT_PDP", "PLACEMENT_SEARCH_RESULTS"]
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  // ... могут быть и другие поля
}

interface UserCampaignSetting {
  id: string; // UUID
  user_id: string; // UUID
  ozon_campaign_id: number;
  performance_credentials_id: string; // UUID
  custom_daily_budget_limit: number | null;
  is_budget_control_enabled: boolean;
  app_controlled_status: string | null; // e.g., 'ACTIVE_CONTROLLED', 'PAUSED_BY_LIMIT', 'USER_MANAGED'
  scheduling_enabled: boolean;
  schedule_start_time: string | null; // e.g., "09:00"
  schedule_end_time: string | null;   // e.g., "18:00"
  schedule_days: string[] | null;   // e.g., ["Mon", "Tue", "Wed"]
  last_checked_at: string | null;   // ISO timestamp
  cached_daily_spend: number | null;
  cached_ozon_status: string | null;
  created_at: string;
  updated_at: string;
}

interface CombinedCampaign extends OzonCampaign {
  userSettings?: UserCampaignSetting;
}

async function getOzonPerformanceToken(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const response = await axios.post(
      'https://api-performance.ozon.ru/api/client/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error fetching Ozon Performance API token:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, clientSecret, userId, performanceCredentialsId } = await request.json();

    if (!clientId || !clientSecret || !userId || !performanceCredentialsId) {
      return NextResponse.json({ error: 'Missing required parameters: clientId, clientSecret, userId, performanceCredentialsId' }, { status: 400 });
    }

    const accessToken = await getOzonPerformanceToken(clientId, clientSecret);
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to authenticate with Ozon Performance API' }, { status: 500 });
    }

    // 1. Получаем кампании с Ozon
    let ozonCampaigns: OzonCampaign[] = [];
    try {
      const ozonResponse = await axios.get('https://api-performance.ozon.ru/api/client/campaign', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': clientId,
          'Content-Type': 'application/json',
        },
      });
      // В документации указано, что ответ содержит campaigns в result
      // Однако, в некоторых случаях (например, при пустом списке) может быть иначе
      ozonCampaigns = ozonResponse.data?.result?.campaigns || ozonResponse.data?.campaigns || [];
      if (!Array.isArray(ozonCampaigns)) {
        console.warn("Ozon API returned campaigns in an unexpected format:", ozonResponse.data);
        ozonCampaigns = [];
      }
    } catch (error) {
      console.error('Error fetching campaigns from Ozon:', error);
      // Не прерываем выполнение, если не удалось получить кампании, вернем пустой список или ошибку, 
      // но сначала попробуем получить пользовательские настройки
    }

    // 2. Получаем пользовательские настройки из Supabase
    const { data: userSettings, error: supabaseError } = await supabase
      .from('user_campaign_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('performance_credentials_id', performanceCredentialsId);

    if (supabaseError) {
      console.error('Error fetching user campaign settings from Supabase:', supabaseError);
      return NextResponse.json({ error: 'Failed to fetch user settings', details: supabaseError.message }, { status: 500 });
    }

    // 3. Объединяем данные
    const combinedCampaigns: CombinedCampaign[] = ozonCampaigns.map(ozonCampaign => {
      const setting = userSettings?.find(s => s.ozon_campaign_id === ozonCampaign.id);
      return {
        ...ozonCampaign,
        userSettings: setting || undefined, // Используем undefined если настройка не найдена
      };
    });

    return NextResponse.json(combinedCampaigns, { status: 200 });

  } catch (error) {
    console.error('Error in /api/ozon/performance/campaigns POST handler:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 