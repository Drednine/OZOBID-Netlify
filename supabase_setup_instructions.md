# OZOBID - Инструкции по настройке Supabase

## Создание проекта в Supabase

Для хранения данных и управления аутентификацией мы будем использовать Supabase - бесплатную альтернативу Firebase с открытым исходным кодом.

### Шаги по созданию проекта в Supabase:

1. Перейдите на сайт Supabase (https://supabase.com/)
2. Нажмите "Start your project" или "Sign up" если у вас еще нет аккаунта
3. Войдите с помощью GitHub или создайте новый аккаунт
4. После входа нажмите "New project"
5. Выберите организацию или создайте новую
6. Заполните данные проекта:
   - Name: OZOBID
   - Database Password: создайте надежный пароль и сохраните его
   - Region: выберите ближайший к вам регион (например, Frankfurt (eu-central-1))
7. Нажмите "Create new project"

Создание проекта может занять несколько минут.

## Получение ключей API

После создания проекта вам потребуется получить ключи API для интеграции с нашим приложением:

1. В панели управления Supabase перейдите в раздел "Project Settings" (значок шестеренки)
2. Выберите "API" в боковом меню
3. В разделе "Project API keys" вы найдете:
   - URL проекта (Project URL)
   - Публичный ключ (anon/public)
   - Секретный ключ (service_role)

Эти данные нам понадобятся для настройки переменных окружения в нашем проекте.

## Настройка базы данных

После получения доступа к проекту, мы настроим необходимые таблицы для нашего приложения:

1. В панели управления Supabase перейдите в раздел "Table Editor"
2. Создайте следующие таблицы:

### Таблица: users
- id (uuid, primary key)
- email (text, unique)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- full_name (text)
- company_name (text)

### Таблица: ozon_credentials
- id (uuid, primary key)
- user_id (uuid, foreign key -> users.id)
- client_id (text)
- api_key (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- is_active (boolean)

### Таблица: campaigns
- id (uuid, primary key)
- user_id (uuid, foreign key -> users.id)
- ozon_campaign_id (text)
- name (text)
- status (text)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- daily_budget (numeric)

### Таблица: budget_settings
- id (uuid, primary key)
- user_id (uuid, foreign key -> users.id)
- daily_limit (numeric)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- notification_threshold (numeric)
- is_active (boolean)

## Настройка политик безопасности

Для обеспечения безопасности данных настройте Row Level Security (RLS):

1. В панели управления Supabase перейдите в раздел "Authentication" -> "Policies"
2. Для каждой таблицы создайте политики, разрешающие пользователям доступ только к их собственным данным

## Следующие шаги

После настройки Supabase мы сможем:
1. Интегрировать аутентификацию в наше приложение
2. Настроить хранение и получение данных
3. Настроить деплой на Vercel
4. Продолжить разработку функционала управления ставками и бюджетом
