// src/lib/types/campaigns.ts

// Представляет данные, приходящие непосредственно от Ozon Performance API для одной кампании
export interface OzonCampaignData {
  id: number; // ID кампании от Ozon (campaignId)
  title: string; // Название кампании от Ozon (name)
  state: string; // Статус кампании от Ozon (например, CAMPAIGN_STATE_RUNNING)
  budget?: number | null; // Общий бюджет кампании, если есть
  dailyBudget?: number | null; // Дневной бюджет, установленный на стороне Ozon, если есть
  // startDate?: string;
  // endDate?: string;
  // Вы можете добавить сюда другие поля, которые получаете от API Ozon и хотите использовать
}

// Представляет настройки пользователя для кампании, хранящиеся в нашей БД (таблица user_campaign_settings)
export interface UserCampaignSettings {
  id?: string; // UUID из таблицы user_campaign_settings (первичный ключ, опционально для новых)
  user_id: string; // UUID пользователя
  ozon_campaign_id: number; // ID кампании Ozon, к которому привязаны эти настройки
  performance_credentials_id: string; // UUID учетных данных Ozon Performance API

  custom_daily_budget_limit?: number | null;
  is_budget_control_enabled?: boolean; // Включен ли контроль дневного бюджета нашим приложением
  
  app_controlled_status?: string | null; // Статус, управляемый приложением (например, PAUSED_DAILY_LIMIT_REACHED)
  
  scheduling_enabled?: boolean; // Включено ли расписание
  schedule_start_time?: string | null; // Время начала работы по расписанию (HH:MM)
  schedule_end_time?: string | null;   // Время окончания работы по расписанию (HH:MM)
  schedule_days?: string[] | null;   // Дни недели для расписания (например, ["Mon", "Tue"])
  
  last_checked_at?: string | null;   // ISO timestamp последнего мониторинга функцией
  cached_daily_spend?: number | null; // Закэшированный дневной расход
  cached_ozon_status?: string | null; // Закэшированный статус кампании от Ozon
  last_daily_limit_pause_date?: string | null; // Дата (YYYY-MM-DD), когда кампания была приостановлена по дневному лимиту

  created_at?: string; // ISO timestamp
  updated_at?: string; // ISO timestamp

  // Клиентские поля для UI, не хранятся в БД напрямую в таком виде
  isDirty?: boolean;
  isSaving?: boolean;
  saveError?: string | null;
}

// Объединенный тип, используемый на фронтенде для отображения кампании Ozon вместе с ее настройками
export interface CombinedCampaign extends OzonCampaignData {
  userSettings: UserCampaignSettings; // Настройки пользователя для этой кампании
} 