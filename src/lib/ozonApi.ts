import axios, { AxiosError } from 'axios';

export interface OzonCredentials {
  clientId: string;
  apiKey: string;
}

export interface PerformanceCredentials {
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

// Проверка валидности API-ключей
export const validateCredentials = async (credentials: OzonCredentials) => {
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

    return { valid: true, error: null };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { 
        valid: false, 
        error: error.response?.status === 403 ? 'Неверные учетные данные API' : 
               error.response?.data?.message || 'Ошибка проверки учетных данных'
      };
    }
    return {
      valid: false,
      error: 'Неизвестная ошибка при проверке учетных данных'
    };
  }
};

// Проверка валидности Performance API-ключей
export const validatePerformanceCredentials = async (credentials: PerformanceCredentials) => {
  try {
    const response = await axios.post(
      'https://performance.ozon.ru/api/client/statistics',
      {
        "dateFrom": new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        "dateTo": new Date().toISOString().split('T')[0],
        "groupBy": ["DATE"]
      },
      {
        headers: {
          'Client-Id': credentials.clientId,
          'Api-Key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return { valid: true, error: null };
  } catch (error) {
    if (error instanceof AxiosError) {
      return { 
        valid: false, 
        error: error.response?.status === 403 ? 'Неверные учетные данные Performance API' : 
               error.response?.data?.message || 'Ошибка проверки учетных данных Performance API'
      };
    }
    return {
      valid: false,
      error: 'Неизвестная ошибка при проверке учетных данных Performance API'
    };
  }
};

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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения списка кампаний' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении списка кампаний'
    };
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка обновления ставок' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при обновлении ставок'
    };
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка обновления бюджета кампании' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при обновлении бюджета кампании'
    };
  }
};

// Получение статистики расходов по кампаниям через Performance API
export const getPerformanceStatistics = async (
  credentials: PerformanceCredentials,
  dateFrom: string,
  dateTo: string
) => {
  try {
    const response = await axios.post(
      'https://performance.ozon.ru/api/client/statistics',
      {
        "dateFrom": dateFrom,
        "dateTo": dateTo,
        "groupBy": ["DATE", "CAMPAIGN_ID", "CAMPAIGN_NAME"]
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения статистики Performance API' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении статистики Performance API'
    };
  }
};

// Получение статистики расходов по кампаниям через Seller API
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения статистики кампаний' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении статистики кампаний'
    };
  }
};

// Получение статистики расходов за сегодня
export const getTodayStatistics = async (credentials: OzonCredentials) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await getCampaignsStatistics(credentials, today, today);
    return response;
  } catch (error) {
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения статистики за сегодня' 
      };
    }
    if (error instanceof Error) {
      return {
        data: null,
        error: error.message
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении статистики за сегодня'
    };
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
        status: status
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка обновления статуса кампании' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при обновлении статуса кампании'
    };
  }
};

// Массовое обновление статусов кампаний
export const updateCampaignsStatuses = async (
  credentials: OzonCredentials,
  statusUpdates: CampaignStatus[]
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v1/marketing/campaign/status/update',
      {
        status_updates: statusUpdates.map(update => ({
          campaign_id: update.campaignId,
          status: update.status
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка обновления статусов кампаний' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при обновлении статусов кампаний'
    };
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
        campaign_id: campaignId
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения товаров кампании' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении товаров кампании'
    };
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
      'https://api-seller.ozon.ru/v1/product/list',
      {
        filter,
        limit,
        offset
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения списка товаров' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении списка товаров'
    };
  }
};

// Получение информации о товарах по их идентификаторам
export const getProductInfo = async (
  credentials: OzonCredentials,
  productIds: string[]
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v2/product/info',
      {
        product_id: productIds
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения информации о товарах' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении информации о товарах'
    };
  }
};

// Получение информации об остатках товаров
export const getProductStock = async (
  credentials: OzonCredentials,
  productIds: string[]
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v2/product/info/stocks',
      {
        product_id: productIds
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения информации об остатках' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении информации об остатках'
    };
  }
};

// Получение информации о ценах товаров
export const getProductPrices = async (
  credentials: OzonCredentials,
  productIds: string[]
) => {
  try {
    const response = await axios.post(
      'https://api-seller.ozon.ru/v2/product/info/prices',
      {
        product_id: productIds
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения информации о ценах' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении информации о ценах'
    };
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения списка категорий' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении списка категорий'
    };
  }
};

// Получение детальной статистики по товарам в рекламных кампаниях
export const getProductsStatistics = async (
  credentials: PerformanceCredentials,
  dateFrom: string,
  dateTo: string,
  campaignIds: string[] = []
) => {
  try {
    const response = await axios.post(
      'https://performance.ozon.ru/api/client/statistics',
      {
        "dateFrom": dateFrom,
        "dateTo": dateTo,
        "groupBy": ["DATE", "CAMPAIGN_ID", "PRODUCT_ID"],
        "filters": campaignIds.length > 0 ? [
          {
            "field": "CAMPAIGN_ID",
            "operator": "IN",
            "values": campaignIds
          }
        ] : []
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
    if (error instanceof AxiosError) {
      return { 
        data: null, 
        error: error.response?.data?.message || 'Ошибка получения статистики по товарам' 
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при получении статистики по товарам'
    };
  }
};

interface StatisticsRow {
  date: string;
  campaignId: string;
  spend: number;
  dimensions: Array<{
    id: string;
    value: string;
  }>;
}

export const checkAndDisableCampaignsIfBudgetExceeded = async (
  credentials: OzonCredentials,
  performanceCredentials: PerformanceCredentials,
  dailyBudget: number,
  autoDisable: boolean = true
) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: statsData } = await getPerformanceStatistics(performanceCredentials, today, today);
    
    if (!statsData || !statsData.rows) {
      throw new Error('Не удалось получить статистику');
    }

    const campaignsToDisable = (statsData.rows as StatisticsRow[])
      .reduce((acc: { [key: string]: StatisticsRow }, row: StatisticsRow) => {
        const campaignId = row.dimensions.find(d => d.id === 'CAMPAIGN_ID')?.value;
        if (!campaignId) return acc;
        
        if (!acc[campaignId]) {
          acc[campaignId] = row;
        } else {
          acc[campaignId].spend += row.spend;
        }
        return acc;
      }, {});

    const overBudgetCampaigns = Object.values(campaignsToDisable)
      .filter(row => row.spend > dailyBudget)
      .map(row => row.dimensions.find(d => d.id === 'CAMPAIGN_ID')?.value)
      .filter((id): id is string => id !== undefined);

    if (overBudgetCampaigns.length > 0 && autoDisable) {
      await updateCampaignsStatuses(credentials, overBudgetCampaigns.map(id => ({
        campaignId: id,
        status: 'paused'
      })));
    }

    return {
      data: {
        overBudgetCampaigns,
        disabledCampaigns: autoDisable ? overBudgetCampaigns : []
      },
      error: null
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      return {
        data: null,
        error: error.response?.data?.message || 'Ошибка при проверке и отключении кампаний'
      };
    }
    if (error instanceof Error) {
      return {
        data: null,
        error: error.message
      };
    }
    return {
      data: null,
      error: 'Неизвестная ошибка при проверке и отключении кампаний'
    };
  }
};
