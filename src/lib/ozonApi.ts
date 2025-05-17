import axios from 'axios';

export interface OzonCredentials {
  clientId: string;
  apiKey: string;
}

export interface BidUpdate {
  campaignId: string;
  productId: string;
  newBid: number;
}

export interface CampaignStatus {
  campaignId: string;
  status: 'active' | 'paused';
}

export interface ProductFilter {
  offer_id?: string;
  product_id?: string;
  visibility?: string;
  category_id?: number;
  search?: string;
  sku?: string[];
}

export const getCampaignsList = async (credentials: OzonCredentials) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v1/marketing/campaign/list',
      {},
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateBids = async (credentials: OzonCredentials, bids: BidUpdate[]) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v1/marketing/bid/set',
      {
        bids: bids.map(bid => ({
          campaign_id: bid.campaignId,
          product_id: bid.productId,
          bid: bid.newBid
        }))
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Обновление бюджета кампании
export const updateCampaignBudget = async (
  credentials: OzonCredentials,
  campaignId: string,
  newBudget: number
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v1/marketing/campaign/budget/update',
      {
        campaign_id: campaignId,
        budget: newBudget,
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Получение статистики расходов по кампаниям
export const getCampaignsStatistics = async (
  credentials: OzonCredentials,
  dateFrom: string,
  dateTo: string
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v1/marketing/statistics/campaign',
      {
        date_from: dateFrom,
        date_to: dateTo,
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Изменение статуса кампании (активация/приостановка)
export const updateCampaignStatus = async (
  credentials: OzonCredentials,
  campaignId: string,
  status: 'active' | 'paused'
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v1/marketing/campaign/status/update',
      {
        campaign_id: campaignId,
        status: status,
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Массовое обновление статусов кампаний
export const updateCampaignsStatuses = async (
  credentials: OzonCredentials,
  statusUpdates: CampaignStatus[]
) => {
  try {
    const promises = statusUpdates.map(update => 
      updateCampaignStatus(credentials, update.campaignId, update.status)
    );
    
    const results = await Promise.allSettled(promises);
    
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failedCount = results.filter(result => result.status === 'rejected').length;
    
    return { 
      data: { 
        success: successCount, 
        failed: failedCount,
        total: statusUpdates.length 
      }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

// Получение списка товаров в кампании
export const getCampaignProducts = async (
  credentials: OzonCredentials,
  campaignId: string
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v1/marketing/campaign/products',
      {
        campaign_id: campaignId,
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Получение списка всех товаров продавца
export const getProductList = async (
  credentials: OzonCredentials,
  filter: ProductFilter = {},
  limit: number = 100,
  offset: number = 0
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v2/product/list',
      {
        filter,
        limit,
        offset,
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Получение информации о товарах по их идентификаторам
export const getProductInfo = async (
  credentials: OzonCredentials,
  productIds: string[]
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v2/product/info/list',
      {
        product_id: productIds,
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Получение информации об остатках товаров
export const getProductStock = async (
  credentials: OzonCredentials,
  productIds: string[]
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v3/product/info/stocks',
      {
        product_id: productIds,
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Получение информации о ценах товаров
export const getProductPrices = async (
  credentials: OzonCredentials,
  productIds: string[]
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v4/product/info/prices',
      {
        product_id: productIds,
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Получение категорий товаров
export const getCategories = async (
  credentials: OzonCredentials
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v2/category/tree',
      {},
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};
