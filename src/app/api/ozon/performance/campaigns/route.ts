import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

// Инициализация Supabase клиента (используйте переменные окружения)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("[API CAMPAIGNS] Supabase URL and Service Role Key are required in environment variables.");
    throw new Error("Supabase URL and Service Role Key are required."); 
}

const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

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
  console.log('[API CAMPAIGNS] Attempting to fetch Ozon Performance API token for ClientId:', clientId.substring(0, 10) + '...'); // Логируем часть ID
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
    if (response.data && response.data.access_token) {
      console.log('[API CAMPAIGNS] Successfully fetched Ozon Performance API token.');
      return response.data.access_token;
    } else {
      console.error('[API CAMPAIGNS] Ozon Performance API token response missing access_token:', response.data);
      return null;
    }
  } catch (error: any) {
    console.error('[API CAMPAIGNS] Error fetching Ozon Performance API token:', error.response?.data || error.message);
    return null;
  }
}

export async function POST(request: NextRequest) {
  console.log('[API CAMPAIGNS] Received POST request.');
  try {
    const body = await request.json();
    const { clientId, clientSecret, userId, performanceCredentialsId } = body;
    console.log('[API CAMPAIGNS] Request body parsed:', { clientId: clientId?.substring(0,10)+'...', userId, performanceCredentialsId });

    if (!clientId || !clientSecret || !userId || !performanceCredentialsId) {
      console.error('[API CAMPAIGNS] Missing required parameters.');
      return NextResponse.json({ error: 'Missing required parameters: clientId, clientSecret, userId, performanceCredentialsId' }, { status: 400 });
    }

    const accessToken = await getOzonPerformanceToken(clientId, clientSecret);
    if (!accessToken) {
      console.error('[API CAMPAIGNS] Failed to authenticate with Ozon Performance API, token is null.');
      return NextResponse.json({ error: 'Failed to authenticate with Ozon Performance API' }, { status: 500 });
    }
    // console.log('[API CAMPAIGNS] Ozon Access Token (first 10 chars):', accessToken.substring(0, 10)); // For verification

    // 1. Получаем кампании с Ozon
    let ozonCampaigns: OzonCampaign[] = [];
    const ozonApiUrl = 'https://api-performance.ozon.ru/api/client/campaign';
    console.log(`[API CAMPAIGNS] Fetching campaigns from Ozon API: ${ozonApiUrl}`);
    try {
      const ozonResponse = await axios.get(ozonApiUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Client-Id': clientId,
          'Content-Type': 'application/json',
        },
        // Можно добавить параметры запроса, если Ozon API их поддерживает (например, для пагинации или фильтров)
        // params: { campaign_ids: [], states: ['CAMPAIGN_STATE_RUNNING', 'CAMPAIGN_STATE_MODERATION_PROCESSING'] }
      });
      console.log('[API CAMPAIGNS] Ozon API response status:', ozonResponse.status);
      console.log('[API CAMPAIGNS] Ozon API raw response data:', JSON.stringify(ozonResponse.data, null, 2));

      // Исправленная логика извлечения кампаний
      if (ozonResponse.data && Array.isArray(ozonResponse.data.list)) {
        ozonCampaigns = ozonResponse.data.list;
      } else if (ozonResponse.data && ozonResponse.data.result && Array.isArray(ozonResponse.data.result.campaigns)) {
        // Оставим старую логику на случай, если Ozon вернет другой формат для других случаев
        ozonCampaigns = ozonResponse.data.result.campaigns;
      } else if (ozonResponse.data && Array.isArray(ozonResponse.data.campaigns)) {
        ozonCampaigns = ozonResponse.data.campaigns;
      } else if (ozonResponse.data && ozonResponse.data.result && Array.isArray(ozonResponse.data.result)) {
         ozonCampaigns = ozonResponse.data.result;
      } else if (ozonResponse.data && Array.isArray(ozonResponse.data)) {
         ozonCampaigns = ozonResponse.data;
      } else {
        console.warn("[API CAMPAIGNS] Ozon API returned campaigns in an unexpected format or an empty list. Raw data:", ozonResponse.data);
        ozonCampaigns = [];
      }
      console.log(`[API CAMPAIGNS] Parsed ${ozonCampaigns.length} campaigns from Ozon.`);

    } catch (error: any) {
      console.error('[API CAMPAIGNS] Error fetching campaigns from Ozon:', error.response?.data || error.message);
      // Не прерываем, чтобы попробовать отдать настройки для уже закэшированных кампаний, если они были бы
    }

    // 2. Получаем пользовательские настройки из Supabase
    console.log(`[API CAMPAIGNS] Fetching user campaign settings from Supabase for userId: ${userId}, performanceCredentialsId: ${performanceCredentialsId}`);
    const { data: userSettings, error: supabaseError } = await supabaseAdmin
      .from('user_campaign_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('performance_credentials_id', performanceCredentialsId);

    if (supabaseError) {
      console.error('[API CAMPAIGNS] Error fetching user campaign settings from Supabase:', supabaseError);
      return NextResponse.json({ error: 'Failed to fetch user settings', details: supabaseError.message }, { status: 500 });
    }
    console.log(`[API CAMPAIGNS] Fetched ${userSettings?.length || 0} user campaign settings from Supabase.`);

    // 3. Объединяем данные
    const combinedCampaigns: CombinedCampaign[] = ozonCampaigns.map(ozonCampaign => {
      const setting = userSettings?.find(s => s.ozon_campaign_id === ozonCampaign.id);
      console.log(`[API CAMPAIGNS] For Ozon Campaign ID: ${ozonCampaign.id} (${ozonCampaign.title}), Found UserSetting: ${setting ? JSON.stringify(setting) : 'NOT FOUND'}`);
      return {
        ...ozonCampaign,
        userSettings: setting || undefined,
      };
    });
    console.log(`[API CAMPAIGNS] Combined ${combinedCampaigns.length} campaigns with user settings.`);
    // Логируем первые несколько объединенных кампаний для проверки
    if (combinedCampaigns.length > 0) {
      console.log("[API CAMPAIGNS] Sample of combined data (first 3):");
      combinedCampaigns.slice(0, 3).forEach(c => console.log(JSON.stringify(c, null, 2)));
    }
    console.log('[API CAMPAIGNS] Sending combined campaigns response.');
    return NextResponse.json(combinedCampaigns, { status: 200 });

  } catch (error: any) {
    console.error('[API CAMPAIGNS] Error in POST handler:', error.message);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
} 