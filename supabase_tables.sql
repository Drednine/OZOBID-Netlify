-- SQL скрипт для создания всех необходимых таблиц в Supabase

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    full_name TEXT,
    company_name TEXT
);

-- Включение Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Таблица учетных данных Озон
CREATE TABLE IF NOT EXISTS public.ozon_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    api_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- Включение Row Level Security
ALTER TABLE public.ozon_credentials ENABLE ROW LEVEL SECURITY;

-- Таблица рекламных кампаний
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    ozon_campaign_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    daily_budget NUMERIC
);

-- Включение Row Level Security
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Таблица настроек бюджета
CREATE TABLE IF NOT EXISTS public.budget_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    daily_limit NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notification_threshold NUMERIC,
    is_active BOOLEAN DEFAULT true,
    store_id TEXT,
    performance_client_id TEXT,
    performance_api_key TEXT
);

-- Включение Row Level Security
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

-- Создание политик безопасности для таблицы users
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Создание политик безопасности для таблицы ozon_credentials
CREATE POLICY "Users can view their own credentials" ON public.ozon_credentials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" ON public.ozon_credentials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" ON public.ozon_credentials
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" ON public.ozon_credentials
    FOR DELETE USING (auth.uid() = user_id);

-- Создание политик безопасности для таблицы campaigns
CREATE POLICY "Users can view their own campaigns" ON public.campaigns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON public.campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
    FOR DELETE USING (auth.uid() = user_id);

-- Создание политик безопасности для таблицы budget_settings
CREATE POLICY "Users can view their own budget settings" ON public.budget_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget settings" ON public.budget_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget settings" ON public.budget_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget settings" ON public.budget_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Создание триггера для автоматического обновления поля updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применение триггера ко всем таблицам
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.ozon_credentials
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.budget_settings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
