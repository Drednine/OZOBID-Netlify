// Типы данных для работы с Ozon API

export interface OzonCredentials {
  clientId: string;
  apiKey: string;
  sellerId?: string;
}

export interface BidUpdate {
  campaignId: string;
  productId: string;
  newBid: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface CampaignsListResponse {
  campaigns: Array<{
    id: string;
    name: string;
    status: string;
    budget?: number;
  }>;
}

// Функции для работы с Ozon API

/**
 * Получение списка рекламных кампаний
 */
export async function getCampaignsList(credentials: OzonCredentials): Promise<ApiResponse<CampaignsListResponse>> {
  try {
    // В реальном приложении здесь будет запрос к API Ozon
    // Для демонстрации возвращаем моковые данные
    return {
      data: {
        campaigns: [
          { id: 'campaign1', name: 'Кампания 1', status: 'active' },
          { id: 'campaign2', name: 'Кампания 2', status: 'active' },
          { id: 'campaign3', name: 'Кампания 3', status: 'paused' }
        ]
      }
    };
  } catch (error) {
    return {
      error: {
        code: 'API_ERROR',
        message: error.message || 'Ошибка при получении списка кампаний'
      }
    };
  }
}

/**
 * Обновление ставок для товаров в рекламной кампании
 */
export async function updateBids(credentials: OzonCredentials, updates: BidUpdate[]): Promise<ApiResponse<void>> {
  try {
    // В реальном приложении здесь будет запрос к API Ozon
    // Для демонстрации просто возвращаем успешный результат
    return {};
  } catch (error) {
    return {
      error: {
        code: 'API_ERROR',
        message: error.message || 'Ошибка при обновлении ставок'
      }
    };
  }
}
