import { NextResponse } from 'next/server';
import { validateCredentials, validatePerformanceCredentials } from '@/lib/ozonApi';
import type { OzonCredentials, PerformanceCredentials } from '@/lib/ozonApi';

export async function POST(request: Request) {
  console.log('API Route validate-ozon-keys: Received request');
  try {
    const body = await request.json();
    console.log('API Route validate-ozon-keys: Parsed body (storeName, sellerApi.clientId, performanceApi.clientId):', 
      { storeName: body.storeName, sellerClientId: body.sellerApi?.clientId, performanceClientId: body.performanceApi?.clientId });
    const { sellerApi, performanceApi, storeName } = body;

    if (!storeName || typeof storeName !== 'string') {
      console.error('API Route validate-ozon-keys: storeName missing or invalid');
      return NextResponse.json({ error: 'Название магазина не указано' }, { status: 400 });
    }

    if (!sellerApi || !sellerApi.clientId || !sellerApi.apiKey) {
      console.error('API Route validate-ozon-keys: Seller API credentials incomplete');
      return NextResponse.json({ error: 'Учетные данные Seller API неполные' }, { status: 400 });
    }

    if (!performanceApi || !performanceApi.clientId || !performanceApi.apiKey) {
      console.error('API Route validate-ozon-keys: Performance API credentials incomplete');
      return NextResponse.json({ error: 'Учетные данные Performance API неполные' }, { status: 400 });
    }

    const ozonCreds: OzonCredentials = {
      clientId: sellerApi.clientId,
      apiKey: sellerApi.apiKey, 
    };
    console.log('API Route validate-ozon-keys: Prepared OzonCredentials for validation (clientId):', ozonCreds.clientId);


    const perfCreds: PerformanceCredentials = {
      clientId: performanceApi.clientId,
      apiKey: performanceApi.apiKey, 
    };
    console.log('API Route validate-ozon-keys: Prepared PerformanceCredentials for validation (clientId):', perfCreds.clientId);

    // Этап 1: Валидация Seller API
    console.log('API Route validate-ozon-keys: Calling validateCredentials for Seller API');
    const sellerValidation = await validateCredentials(ozonCreds);
    console.log('API Route validate-ozon-keys: Seller API validation result:', sellerValidation);

    if (!sellerValidation.valid) {
      return NextResponse.json(
        {
          error: `Ошибка проверки Seller API: ${sellerValidation.error || 'Неизвестная ошибка'}`,
          source: 'seller'
        },
        { status: 400 }
      );
    }

    // Этап 2: Валидация Performance API
    console.log('API Route validate-ozon-keys: Calling validatePerformanceCredentials for Performance API');
    const performanceValidation = await validatePerformanceCredentials(perfCreds);
    console.log('API Route validate-ozon-keys: Performance API validation result:', performanceValidation);

    if (!performanceValidation.valid) {
      return NextResponse.json(
        {
          error: `Ошибка проверки Performance API: ${performanceValidation.error || 'Неизвестная ошибка'}`,
          source: 'performance'
        },
        { status: 400 }
      );
    }

    // Если обе валидации прошли успешно
    // TODO: Здесь будет логика сохранения магазина в базу данных (Supabase)
    console.log('API Route validate-ozon-keys: All credentials validated successfully for store:', storeName);
    // Примеры для работы с Supabase (потребуется supabaseAdmin клиент):
    // const { data: existingStore, error: fetchError } = await supabaseAdmin
    // .from('ozon_credentials')
    // .select('id')
    // .eq('client_id', ozonCreds.clientId) // Проверка по Client-Id Seller API, например
    // .eq('user_id', userId) // Нужен ID пользователя
    // .maybeSingle();
    // 
    // if(fetchError) { /* обработка ошибки */ }
    // if(existingStore) { /* магазин уже существует */ }
    // 
    // const { data, error: dbError } = await supabaseAdmin.from('ozon_credentials').insert([
    //   { 
    //     user_id: userId, // Нужно получить ID текущего пользователя
    //     store_name: storeName,
    //     client_id: ozonCreds.clientId,
    //     api_key: ozonCreds.apiKey, // Шифровать перед сохранением!
    //     performance_client_id: perfCreds.clientId,
    //     performance_api_key: perfCreds.apiKey, // Шифровать перед сохранением!
    //     is_active: true
    //   }
    // ]);
    // if (dbError) { throw dbError; }

    return NextResponse.json({ message: 'Учетные данные успешно проверены! Магазин пока не сохраняется.', storeName }, { status: 200 });

  } catch (error) {
    console.error('Ошибка в API-роуте validate-ozon-keys:', error);
    let errorMessage = 'Внутренняя ошибка сервера';
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('API Route validate-ozon-keys: Error stack:', error.stack);
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 