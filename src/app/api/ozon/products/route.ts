import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

interface OzonProductListItem {
  product_id: number;
  offer_id: string;
}

interface OzonProductInfoItem {
  id: number; // Совпадает с product_id
  name: string;
  offer_id: string;
  barcode: string;
  category_id: number;
  images: { file_name: string; default: boolean }[];
  description: string;
  // ... другие поля из /v3/product/info/list
}

interface OzonProductPriceItem {
  product_id: number;
  offer_id: string;
  price: {
    price: string; // Цена в рублях, например "123.45"
    old_price: string;
    vat: string;
    // ...
  };
  // ...
}

interface OzonProductStockItem {
  product_id: number;
  offer_id: string;
  stocks: {
    type: 'fbs' | 'fbo' | 'crossborder';
    present: number; // Остаток
    reserved: number;
  }[];
}

// Интерфейс для агрегированного товара, который будет возвращен клиенту
interface AggregatedProduct {
  id: number;
  name: string;
  sku: string; // offer_id
  category: string; // Пока оставим как строку, позже можно добавить резолв имени категории
  price: number;
  oldPrice: number;
  stock: number;
  status?: string; // Можно будет добавить из product/list или product/info
  images: string[]; // URL основных изображений
  url: string;
  description?: string;
  barcode?: string;
}

const OZON_API_TIMEOUT = 25000; // Увеличенный таймаут для Ozon API запросов
const MAX_IDS_PER_REQUEST = 500; // Максимальное количество ID для пакетных запросов Ozon (уточнить по документации)

async function batchRequest(url: string, ids: (number | string)[], fieldName: string, clientId: string, apiKey: string) {
  const results: any[] = [];
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_REQUEST) {
    const batch = ids.slice(i, i + MAX_IDS_PER_REQUEST);
    try {
      const response = await axios.post(
        url,
        { [fieldName]: batch },
        {
          headers: { 'Client-Id': clientId, 'Api-Key': apiKey, 'Content-Type': 'application/json' },
          timeout: OZON_API_TIMEOUT,
        }
      );
      if (response.data && response.data.result) {
        // Для /v3/product/info/list ответ response.data.result.items
        // Для /v4/product/info/prices ответ response.data.result (массив)
        // Для /v2/product/info/stocks ответ response.data.result.items
        if (response.data.result.items) {
          results.push(...response.data.result.items);
        } else if (Array.isArray(response.data.result)) { // Специально для /v4/product/info/prices
          results.push(...response.data.result);
        } else {
           console.warn(`Batch request to ${url} for field ${fieldName} returned unexpected result structure:`, response.data.result);
        }
      } else {
         console.warn(`Batch request to ${url} for field ${fieldName} returned no data or no result object:`, response.data);
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Error in batchRequest to ${url} for IDs ${batch.slice(0,5)}...:`, axiosError.message);
      if (axiosError.response) {
        console.error(`Ozon API Error Response for ${url}:`, axiosError.response.data);
      }
      // Не прерываем весь процесс, а возвращаем пустой результат для этой пачки
    }
  }
  return results;
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, apiKey, storeName, pageSize = 50, lastId = "" } = body; // Увеличил pageSize по умолчанию

    if (!clientId || !apiKey) {
      return NextResponse.json({ error: 'Missing clientId or apiKey' }, { status: 400 });
    }

    console.log(`API ozon/products (v2): Received request for store: ${storeName || 'N/A'}, clientId: ${clientId}, pageSize: ${pageSize}, lastId: ${lastId}`);

    // 1. Получение списка товаров (product_id, offer_id)
    const productListRequestBody: any = {
      limit: pageSize,
      last_id: lastId,
    };
    // Если lastId пустой (первая страница), его не нужно передавать в Ozon API по некоторым версиям документации
    if (!lastId) {
      delete productListRequestBody.last_id;
    }
    // Попробуем также не передавать filter, чтобы Ozon использовал свои значения по умолчанию.
    // Если это не поможет, можно вернуть: filter: { visibility: "ALL" }

    console.log('API ozon/products (v2 -> v3): Requesting /v3/product/list with body:', productListRequestBody);

    const productListResponse = await axios.post(
      'https://api-seller.ozon.ru/v3/product/list',
      productListRequestBody,
      {
        headers: { 'Client-Id': clientId, 'Api-Key': apiKey, 'Content-Type': 'application/json' },
        timeout: OZON_API_TIMEOUT,
      }
    );

    if (!productListResponse.data || !productListResponse.data.result) {
      console.error('API ozon/products (v2): Failed to fetch product list or unexpected structure', productListResponse.data);
      return NextResponse.json({ error: 'Failed to fetch product list' }, { status: 500 });
    }

    const productListItems: OzonProductListItem[] = productListResponse.data.result.items || [];
    const nextLastId: string = productListResponse.data.result.last_id || "";
    const totalItemsInList: number = productListResponse.data.result.total || productListItems.length;

    console.log(`API ozon/products (v3): Fetched ${productListItems.length} product IDs. Next last_id: ${nextLastId}, Total in list (calculated): ${totalItemsInList}`);

    if (productListItems.length === 0) {
      return NextResponse.json({ items: [], last_id: nextLastId, total_items: totalItemsInList });
    }

    const productIds = productListItems.map(item => item.product_id);
    const offerIds = productListItems.map(item => item.offer_id); // Может понадобиться

    // 2. Получение детальной информации
    // Важно: /v3/product/info/list и /v4/product/info/prices используют product_id
    // /v2/product/info/stocks может использовать product_id ИЛИ offer_id ИЛИ sku (который равен offer_id)

    const [productInfoData, productPriceData, productStockData] = await Promise.all([
      batchRequest('https://api-seller.ozon.ru/v3/product/info/list', productIds, 'product_id', clientId, apiKey),
      batchRequest('https://api-seller.ozon.ru/v4/product/info/prices', productIds, 'product_id', clientId, apiKey),
      batchRequest('https://api-seller.ozon.ru/v2/product/info/stocks', productIds, 'product_id', clientId, apiKey)
      // Альтернативно для stocks можно использовать offer_id, если с product_id будут проблемы:
      // batchRequest('https://api-seller.ozon.ru/v2/product/info/stocks', offerIds, 'offer_id', clientId, apiKey)
    ]);
    
    console.log(`API ozon/products (v2): Fetched details: info=${productInfoData.length}, price=${productPriceData.length}, stock=${productStockData.length}`);

    // 3. Агрегация данных
    const aggregatedProducts: AggregatedProduct[] = productListItems.map(listItem => {
      const info: OzonProductInfoItem | undefined = productInfoData.find(p => p.id === listItem.product_id);
      const priceInfo: OzonProductPriceItem | undefined = productPriceData.find(p => p.product_id === listItem.product_id);
      const stockInfo: OzonProductStockItem | undefined = productStockData.find(p => p.product_id === listItem.product_id);

      let totalStock = 0;
      if (stockInfo && stockInfo.stocks) {
        totalStock = stockInfo.stocks.reduce((sum, s) => sum + (s.present || 0), 0);
      }
      
      const mainImage = info?.images?.find(img => img.default)?.file_name || info?.images?.[0]?.file_name || "";

      return {
        id: listItem.product_id,
        name: info?.name || 'Без названия',
        sku: listItem.offer_id,
        category: info?.category_id?.toString() || 'Без категории', // Пока ID категории
        price: parseFloat(priceInfo?.price?.price || "0"),
        oldPrice: parseFloat(priceInfo?.price?.old_price || "0"),
        stock: totalStock,
        images: mainImage ? [mainImage] : [], // Пока только одно основное изображение
        url: `https://ozon.ru/product/${listItem.product_id}`,
        description: info?.description,
        barcode: info?.barcode,
        // status: info.status?.state_name (нужно смотреть структуру статуса из /v3/product/info/list)
      };
    });

    console.log(`API ozon/products (v2): Successfully aggregated ${aggregatedProducts.length} products for clientId: ${clientId}`);
    return NextResponse.json({ items: aggregatedProducts, last_id: nextLastId, total_items: totalItemsInList });

  } catch (error: any) {
    console.error('API ozon/products (v2): Unhandled error in POST handler:', error.message);
    if (error.response) {
      console.error('API ozon/products (v2): Ozon API Error Response (unhandled):', error.response.data);
      return NextResponse.json({ error: 'Error from Ozon API (unhandled)', details: error.response.data }, { status: error.response.status || 500 });
    }
    return NextResponse.json({ error: 'Internal server error while fetching and aggregating products', details: error.message }, { status: 500 });
  }
} 