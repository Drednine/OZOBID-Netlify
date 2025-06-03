import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Используем СЕРВИСНЫЙ КЛЮЧ для операций на сервере
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Создаем отдельный клиент для этого API роута с сервисным ключом
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

// Интерфейс для данных, приходящих с фронтенда
interface UserCampaignSettingInput {
  id?: string; // UUID существующей настройки, если есть (для обновления по id)
  ozon_campaign_id: number;
  user_id: string;
  performance_credentials_id: string;
  custom_daily_budget_limit: number | null;
  is_budget_control_enabled: boolean;
  // app_controlled_status не управляется напрямую пользователем через эту ручку,
  // он может быть сброшен или изменен фоновым процессом или при определенных действиях.
  // scheduling_enabled и другие поля расписания пока не обрабатываем здесь.
}

export async function POST(request: NextRequest) {
  try {
    const settingsInput: UserCampaignSettingInput = await request.json();

    const { 
      id, // Может быть undefined, если это новая настройка
      ozon_campaign_id,
      user_id,
      performance_credentials_id,
      custom_daily_budget_limit,
      is_budget_control_enabled
    } = settingsInput;

    if (!ozon_campaign_id || !user_id || !performance_credentials_id) {
      return NextResponse.json(
        { error: 'Missing required fields: ozon_campaign_id, user_id, performance_credentials_id' }, 
        { status: 400 }
      );
    }

    // Данные для вставки или обновления
    // Важно: не передаем isDirty, saveError, isSaving на бэкенд для сохранения в БД
    const dataToUpsert = {
      // id: id, // Если id есть, upsert попытается обновить по нему, если он PK
      user_id,
      performance_credentials_id,
      ozon_campaign_id,
      is_budget_control_enabled,
      custom_daily_budget_limit: custom_daily_budget_limit === undefined ? null : custom_daily_budget_limit,
      // При ручном сохранении пользовательских настроек, можно сбросить app_controlled_status 
      // или установить в 'USER_MANAGED', если ранее он был под контролем приложения.
      // Для простоты пока просто сохраняем то, что пришло, или не трогаем это поле здесь.
      // updated_at будет обновлен автоматически Supabase триггером или функцией now()
    };

    let savedData;
    let error;

    if (id) {
      // Если ID предоставлен, пытаемся обновить по ID
      // Это более явное обновление, если фронтенд знает ID настройки
      const { data, error: updateError } = await supabaseAdmin
        .from('user_campaign_settings')
        .update(dataToUpsert)
        .eq('id', id)
        .eq('user_id', user_id) // Доп. проверка, что юзер обновляет свою запись
        .select()
        .single(); // Ожидаем одну запись
      savedData = data;
      error = updateError;
    } else {
      // Если ID не предоставлен, используем upsert с onConflict
      // Это требует наличия UNIQUE ограничения на (user_id, performance_credentials_id, ozon_campaign_id)
      // или другого подходящего ограничения, указанного в onConflict.
      // Если такого ограничения нет, onConflict нужно будет убрать или настроить правильно.
      const { data, error: upsertError } = await supabaseAdmin
        .from('user_campaign_settings')
        .upsert(dataToUpsert, {
          onConflict: 'user_id,performance_credentials_id,ozon_campaign_id', // Убедитесь, что такой UNIQUE constraint есть
          // ignoreDuplicates: false, // default, нужно для обновления
        })
        .select()
        .single(); // Ожидаем одну запись
      savedData = data;
      error = upsertError;
    }

    if (error) {
      console.error('Supabase error saving campaign settings:', error);
      return NextResponse.json({ error: 'Failed to save settings to database', details: error.message }, { status: 500 });
    }

    if (!savedData) {
      console.error('No data returned from Supabase after save/upsert operation.');
      return NextResponse.json({ error: 'Failed to save settings: No data returned' }, { status: 500 });
    }

    // Возвращаем сохраненные данные (включая id, created_at, updated_at из БД)
    return NextResponse.json(savedData, { status: 200 });

  } catch (err: any) {
    console.error('Error in /api/user-campaign-settings POST handler:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
} 