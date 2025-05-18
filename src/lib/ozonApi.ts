import axios from 'axios';

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
    return { 
      valid: false, 
      error: error.response?.status === 403 ? 'Неверные учетные данные API' : 
             error.response?.data?.message || 'Ошибка проверки учетных данных'
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
    return { 
      valid: false, 
      error: error.response?.status === 403 ? 'Неверные учетные данные Performance API' : 
             error.response?.data?.message || 'Ошибка проверки учетных данных Performance API'
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения списка кампаний' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка обновления ставок' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка обновления бюджета кампании' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения статистики Performance API' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения статистики кампаний' 
    };
  }
};

// Получение статистики расходов за сегодня
export const getTodayStatistics = async (credentials: OzonCredentials) => {
  const today = new Date().toISOString().split('T')[0];
  return getCampaignsStatistics(credentials, today, today);
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка обновления статуса кампании' 
    };
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка массового обновления статусов кампаний' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения товаров кампании' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения списка товаров' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения информации о товарах' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения информации об остатках' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения информации о ценах' 
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения категорий товаров' 
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
    const payload: any = {
      "dateFrom": dateFrom,
      "dateTo": dateTo,
      "groupBy": ["DATE", "CAMPAIGN_ID", "SKU"]
    };
    
    if (campaignIds.length > 0) {
      payload.filter = {
        "campaignIds": campaignIds
      };
    }
    
    const response = await axios.post(
      'https://performance.ozon.ru/api/client/statistics',
      payload,
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
    return { 
      data: null, 
      error: error.response?.data?.message || 'Ошибка получения статистики по товарам' 
    };
  }
};

// Проверка и отключение кампаний при превышении дневного бюджета
export const checkAndDisableCampaignsIfBudgetExceeded = async (
  credentials: OzonCredentials,
  performanceCredentials: PerformanceCredentials,
  dailyBudget: number,
  autoDisable: boolean = true
) => {
  try {
    // Получаем статистику расходов за сегодня
    const today = new Date().toISOString().split('T')[0];
    const { data: statsData, error: statsError } = await getPerformanceStatistics(
      performanceCredentials,
      today,
      today
    );
    
    if (statsError) {
      throw new Error(statsError);
    }
    
    // Рассчитываем общие расходы
    let totalSpent = 0;
    const campaignSpending = {};
    
    if (statsData && statsData.rows) {
      statsData.rows.forEach(row => {
        const campaignId = row.dimensions.find(d => d.id === 'CAMPAIGN_ID')?.value;
        const campaignName = row.dimensions.find(d => d.id === 'CAMPAIGN_NAME')?.value;
        const spent = row.metrics.find(m => m.id === 'SPENDING')?.value || 0;
        
        if (campaignId) {
          campaignSpending[campaignId] = {
            id: campaignId,
            name: campaignName,
            spent: parseFloat(spent)
          };
          totalSpent += parseFloat(spent);
        }
      });
    }
    
    // Проверяем, превышен ли дневной бюджет
    const isBudgetExceeded = totalSpent >= dailyBudget;
    
    // Если бюджет превышен и включено автоотключение, отключаем все активные кампании
    if (isBudgetExceeded && autoDisable) {
      // Получаем список активных кампаний
      const { data: campaignsData, error: campaignsError } = await getCampaignsList(credentials);
      
      if (campaignsError) {
        throw new Error(campaignsError);
      }
      
      const activeCampaigns = campaignsData?.campaigns?.filter(c => c.state === 'active') || [];
      
      // Отключаем все активные кампании
      if (activeCampaigns.length > 0) {
        const statusUpdates = activeCampaigns.map(campaign => ({
          campaignId: campaign.id,
          status: 'paused' as 'paused'
        }));
        
        const { data: updateResult, error: updateError } = await updateCampaignsStatuses(
          credentials,
          statusUpdates
        );
        
        if (updateError) {
          throw new Error(updateError);
        }
        
        return {
          data: {
            budgetExceeded: true,
            totalSpent,
            dailyBudget,
            campaignsDisabled: updateResult.success,
            campaignSpending
          },
          error: null
        };
      }
    }
    
    return {
      data: {
        budgetExceeded: isBudgetExceeded,
        totalSpent,
        dailyBudget,
        campaignsDisabled: 0,
        campaignSpending
      },
      error: null
    };
  } catch (error) {
    return { 
      data: null, 
      error: error.message || 'Ошибка проверки и отключения кампаний' 
    };
  }
};
