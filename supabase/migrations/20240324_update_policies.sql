-- Обновление политик безопасности для таблицы users
DROP POLICY IF EXISTS "Users can view their own data" ON public.users;
DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;

CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Обновление политик безопасности для таблицы ozon_credentials
DROP POLICY IF EXISTS "Users can view their own credentials" ON public.ozon_credentials;
DROP POLICY IF EXISTS "Users can insert their own credentials" ON public.ozon_credentials;
DROP POLICY IF EXISTS "Users can update their own credentials" ON public.ozon_credentials;
DROP POLICY IF EXISTS "Users can delete their own credentials" ON public.ozon_credentials;

CREATE POLICY "Users can view their own credentials" ON public.ozon_credentials
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" ON public.ozon_credentials
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" ON public.ozon_credentials
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" ON public.ozon_credentials
    FOR DELETE USING (auth.uid() = user_id);

-- Обновление политик безопасности для таблицы campaigns
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;

CREATE POLICY "Users can view their own campaigns" ON public.campaigns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON public.campaigns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON public.campaigns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON public.campaigns
    FOR DELETE USING (auth.uid() = user_id);

-- Обновление политик безопасности для таблицы budget_settings
DROP POLICY IF EXISTS "Users can view their own budget settings" ON public.budget_settings;
DROP POLICY IF EXISTS "Users can insert their own budget settings" ON public.budget_settings;
DROP POLICY IF EXISTS "Users can update their own budget settings" ON public.budget_settings;
DROP POLICY IF EXISTS "Users can delete their own budget settings" ON public.budget_settings;

CREATE POLICY "Users can view their own budget settings" ON public.budget_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget settings" ON public.budget_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget settings" ON public.budget_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget settings" ON public.budget_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Включение Row Level Security для всех таблиц
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ozon_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY; 