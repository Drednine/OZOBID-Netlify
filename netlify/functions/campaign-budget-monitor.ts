import { SupabaseClient, createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions';

// Инициализация Supabase клиента (используйте переменные окружения)
const supabaseUrl = process.env.SUPABASE_URL!;
// const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Supabase URL and Service Role Key are required but not found in environment variables.");
    // В реальном сценарии здесь лучше выбросить ошибку, чтобы функция не продолжала выполнение
    throw new Error("Supabase URL and Service Role Key are required."); 
}

const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// Интерфейсы (могут быть вынесены в общий файл типов позже)
interface OzonPerformanceCredentials {
    id: string;
    user_id: string;
    name: string;
    ozon_client_id: string;
    ozon_client_secret: string;
    created_at?: string;
    updated_at?: string;
}

interface UserCampaignSetting {
    id: string; // UUID
    user_id: string; // UUID
    ozon_campaign_id: number;
    performance_credentials_id: string; // UUID
    custom_daily_budget_limit: number | null;
    is_budget_control_enabled: boolean;
    app_controlled_status: string | null;
    scheduling_enabled: boolean;
    schedule_start_time: string | null; // e.g., "09:00"
    schedule_end_time: string | null;   // e.g., "18:00"
    schedule_days: string[] | null;   // e.g., ["Mon", "Tue", "Wed"]
    last_checked_at: string | null;   // ISO timestamp
    last_daily_limit_pause_date: string | null; // Дата, когда кампания была приостановлена по дневному лимиту
    cached_daily_spend: number | null;
    cached_ozon_status: string | null;
    created_at: string;
    updated_at: string;
}

// === Ozon API Helper Functions ===
async function getOzonPerformanceToken(clientId: string, clientSecret: string): Promise<string | null> {
    try {
        const response = await axios.post(
            'https://api-performance.ozon.ru/api/client/token',
            {
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
            },
            { headers: { 'Content-Type': 'application/json' } }
        );
        return response.data.access_token;
    } catch (error) {
        console.error(`Error fetching Ozon Performance API token for ClientID ${clientId.substring(0,5)}...:`, 
            (error as any).response?.data || (error as any).message);
        return null;
    }
}

async function getOzonCampaignStatus(campaignId: number, clientId: string, accessToken: string): Promise<string | null> {
    try {
        const response = await axios.get(`https://api-performance.ozon.ru/api/client/campaign/${campaignId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-Id': clientId,
                },
            }
        );
        return response.data?.state || null; // e.g., CAMPAIGN_STATE_RUNNING
    } catch (error) {
        console.error(`Error fetching Ozon campaign status for campaignId ${campaignId}:`,
            (error as any).response?.data || (error as any).message);
        return null;
    }
}

async function getOzonCampaignDailySpend(campaignId: number, clientId: string, accessToken: string, date: string): Promise<number | null> {
    // date в формате YYYY-MM-DD
    try {
        const response = await axios.get('https://api-performance.ozon.ru/api/client/statistics/campaign/product/json', {
            params: {
                campaigns: [campaignId],
                dateFrom: date,
                dateTo: date,
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Client-Id': clientId,
            },
        });
        // Ожидаем, что данные придут в виде массива объектов, где каждый объект - статистика по кампании
        // Если кампания одна, то массив из одного элемента
        const campaignStats = response.data?.[0]; // или response.data?.result?.[0] - нужно проверить по факту
        return campaignStats?.spent ?? null; // Сумма расходов
    } catch (error) {
        console.error(`Error fetching Ozon campaign daily spend for campaignId ${campaignId} on ${date}:`,
            (error as any).response?.data || (error as any).message);
        return null;
    }
}

async function toggleOzonCampaign(campaignId: number, clientId: string, accessToken: string, activate: boolean): Promise<boolean> {
    const action = activate ? 'activate' : 'deactivate';
    try {
        await axios.post(`https://api-performance.ozon.ru/api/client/campaign/${campaignId}/${action}`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Client-Id': clientId,
                },
            }
        );
        console.log(`Campaign ${campaignId} successfully ${action}d.`);
        return true;
    } catch (error) {
        console.error(`Error ${action}ing Ozon campaign ${campaignId}:`,
            (error as any).response?.data || (error as any).message);
        return false;
    }
}

// === Logic Helper Functions ===
function getCurrentDateYYYYMMDD(): string {
    return new Date().toISOString().split('T')[0];
}

function checkSchedule(setting: UserCampaignSetting): boolean {
    if (!setting.scheduling_enabled || !setting.schedule_start_time || !setting.schedule_end_time || !setting.schedule_days || setting.schedule_days.length === 0) {
        return true; // Если расписание не настроено полностью, считаем, что ограничений нет
    }
    const now = new Date();
    const currentDay = now.toLocaleString('en-US', { weekday: 'short' }); // Mon, Tue, etc.
    if (!setting.schedule_days.includes(currentDay)) {
        return false; // Не тот день недели
    }

    const [startH, startM] = setting.schedule_start_time.split(':').map(Number);
    const [endH, endM] = setting.schedule_end_time.split(':').map(Number);
    
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);

    return now >= startTime && now <= endTime;
}


// === Netlify Function Handler ===
const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
    console.log('Netlify Function campaign-budget-monitor invoked at:', new Date().toISOString());

    try {
        // 1. Получить все активные настройки кампаний
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('user_campaign_settings')
            .select(`
                *,
                ozon_performance_credentials (ozon_client_id, ozon_client_secret)
            `)
            .or('is_budget_control_enabled.eq.true,scheduling_enabled.eq.true');

        if (settingsError) {
            console.error('Error fetching campaign settings:', settingsError);
            return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch settings' }) };
        }

        if (!settings || settings.length === 0) {
            console.log('No active campaign settings found to monitor.');
            return { statusCode: 200, body: JSON.stringify({ message: 'No active settings to monitor' }) };
        }

        const currentDate = getCurrentDateYYYYMMDD();

        for (const setting of settings as (UserCampaignSetting & { ozon_performance_credentials: Pick<OzonPerformanceCredentials, 'ozon_client_id' | 'ozon_client_secret'> | null })[] ) {
            if (!setting.ozon_performance_credentials) {
                console.warn(`Skipping campaign ${setting.ozon_campaign_id} due to missing performance credentials link.`);
                continue;
            }
            
            const { ozon_client_id, ozon_client_secret } = setting.ozon_performance_credentials;
            const accessToken = await getOzonPerformanceToken(ozon_client_id, ozon_client_secret);

            if (!accessToken) {
                console.warn(`Skipping campaign ${setting.ozon_campaign_id} for user ${setting.user_id} due to auth token failure.`);
                continue;
            }

            let ozonCampaignCurrentStatus = await getOzonCampaignStatus(setting.ozon_campaign_id, ozon_client_id, accessToken);
            let dailySpend: number | null = null;
            let newAppControlledStatus = setting.app_controlled_status;
            let shouldBeActiveBySchedule = true; // По умолчанию считаем, что должна быть активна

            // --- Логика возобновления на следующий день ---
            if (setting.app_controlled_status === 'PAUSED_DAILY_LIMIT_REACHED' && setting.last_daily_limit_pause_date && setting.last_daily_limit_pause_date < currentDate) {
                console.log(`Attempting to reactivate campaign ${setting.ozon_campaign_id} as new day has started.`);
                newAppControlledStatus = 'USER_MANAGED'; // или ACTIVE_CONTROLLED/ACTIVE_SCHEDULED
                // Логика активации будет ниже, если по расписанию и бюджету все ок
            }

            // --- Логика Расписания ---
            if (setting.scheduling_enabled) {
                shouldBeActiveBySchedule = checkSchedule(setting);
                if (ozonCampaignCurrentStatus && ozonCampaignCurrentStatus !== 'CAMPAIGN_STATE_ARCHIVED') { // Не трогаем архивные
                    if (shouldBeActiveBySchedule && ozonCampaignCurrentStatus.includes('_STOPPED')) { // Нужно запустить
                         if (newAppControlledStatus !== 'PAUSED_DAILY_LIMIT_REACHED') { // Если не на паузе по бюджету
                            console.log(`Scheduling: Activating campaign ${setting.ozon_campaign_id}.`);
                            const success = await toggleOzonCampaign(setting.ozon_campaign_id, ozon_client_id, accessToken, true);
                            if (success) ozonCampaignCurrentStatus = 'CAMPAIGN_STATE_RUNNING'; // Предполагаемый статус
                            newAppControlledStatus = 'ACTIVE_SCHEDULED';
                         }
                    } else if (!shouldBeActiveBySchedule && !ozonCampaignCurrentStatus.includes('_STOPPED')) { // Нужно остановить
                        console.log(`Scheduling: Deactivating campaign ${setting.ozon_campaign_id}.`);
                        const success = await toggleOzonCampaign(setting.ozon_campaign_id, ozon_client_id, accessToken, false);
                        if (success) ozonCampaignCurrentStatus = 'CAMPAIGN_STATE_STOPPED'; // Предполагаемый статус
                        newAppControlledStatus = 'PAUSED_SCHEDULED';
                    }
                }
            }

            // --- Логика Дневного Бюджета (только если кампания должна быть активна по расписанию) ---
            if (setting.is_budget_control_enabled && shouldBeActiveBySchedule && ozonCampaignCurrentStatus === 'CAMPAIGN_STATE_RUNNING') {
                 dailySpend = await getOzonCampaignDailySpend(setting.ozon_campaign_id, ozon_client_id, accessToken, currentDate);
                 if (dailySpend !== null && setting.custom_daily_budget_limit !== null && dailySpend >= setting.custom_daily_budget_limit) {
                    console.log(`Budget Control: Daily limit ${setting.custom_daily_budget_limit} reached for campaign ${setting.ozon_campaign_id} (spent: ${dailySpend}). Deactivating.`);
                    const success = await toggleOzonCampaign(setting.ozon_campaign_id, ozon_client_id, accessToken, false);
                    if (success) ozonCampaignCurrentStatus = 'CAMPAIGN_STATE_STOPPED_BY_LIMIT'; // Наш внутренний, или реальный от Ozon
                    newAppControlledStatus = 'PAUSED_DAILY_LIMIT_REACHED';
                    // Обновляем дату приостановки по лимиту
                    await supabaseAdmin.from('user_campaign_settings').update({ last_daily_limit_pause_date: currentDate }).eq('id', setting.id);
                 }
            }

            // Обновляем запись в БД
            const updatePayload: Partial<UserCampaignSetting> = {
                last_checked_at: new Date().toISOString(),
                cached_daily_spend: dailySpend,
                cached_ozon_status: ozonCampaignCurrentStatus,
                app_controlled_status: newAppControlledStatus,
            };
            // Если статус изменился на 'PAUSED_DAILY_LIMIT_REACHED' и это новая запись, то last_daily_limit_pause_date уже обновлен выше
            // Если же статус сменился с PAUSED_DAILY_LIMIT_REACHED на другой (например, при возобновлении), то сбросим дату
            if (setting.app_controlled_status === 'PAUSED_DAILY_LIMIT_REACHED' && newAppControlledStatus !== 'PAUSED_DAILY_LIMIT_REACHED') {
                updatePayload.last_daily_limit_pause_date = null;
            }

            const { error: updateError } = await supabaseAdmin
                .from('user_campaign_settings')
                .update(updatePayload)
                .eq('id', setting.id);

            if (updateError) {
                console.error(`Failed to update settings for campaign_id ${setting.ozon_campaign_id}:`, updateError);
            }
        }

        return { statusCode: 200, body: JSON.stringify({ message: 'Campaigns processed successfully' }) };

    } catch (error: any) {
        console.error('Unhandled error in campaign-budget-monitor function:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error', details: error.message }) };
    }
};

export { handler }; 