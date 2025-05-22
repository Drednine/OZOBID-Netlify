export const OZON_API_CONFIG = {
  BASE_URL: 'https://api-seller.ozon.ru',
  PERFORMANCE_URL: 'https://performance.ozon.ru',
  API_VERSION: 'v1',
  ENDPOINTS: {
    // Товары
    PRODUCTS_LIST: '/v2/product/list',
    PRODUCT_INFO: '/v2/product/info',
    PRODUCT_UPDATE: '/v2/product/update',
    
    // Рекламные кампании
    CAMPAIGNS_LIST: '/api/client/campaign/list',
    CAMPAIGN_INFO: '/api/client/campaign',
    CAMPAIGN_UPDATE: '/api/client/campaign/update',
    CAMPAIGN_STATE: '/api/client/campaign/state',
    
    // Статистика
    STATISTICS: '/api/client/statistics',
    PERFORMANCE_STATS: '/api/performance/statistics',
    
    // Бюджет
    BUDGET_UPDATE: '/api/client/campaign/budget',
    BUDGET_STATS: '/api/client/campaign/budget/stats',
  },
  
  // Лимиты запросов
  RATE_LIMITS: {
    REQUESTS_PER_SECOND: 10,
    REQUESTS_PER_MINUTE: 200,
  },
  
  // Статусы кампаний
  CAMPAIGN_STATES: {
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'archived',
  },
  
  // Таймауты
  TIMEOUTS: {
    DEFAULT: 30000, // 30 секунд
    LONG: 60000,    // 1 минута
  },
};

// Коды ошибок
export const OZON_ERROR_CODES = {
  UNAUTHORIZED: 'unauthorized',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  INVALID_REQUEST: 'invalid_request',
  SERVER_ERROR: 'server_error',
  CAMPAIGN_NOT_FOUND: 'campaign_not_found',
  PRODUCT_NOT_FOUND: 'product_not_found',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
};

// Параметры ретрая запросов
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000,
  MAX_RETRY_DELAY: 5000,
  RETRY_STATUS_CODES: [408, 429, 500, 502, 503, 504],
}; 