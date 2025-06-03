export interface OzonCredentials {
  clientId: string;
  apiKey: string;
}

export interface OzonCampaign {
  id: string;
  name: string;
  state: 'active' | 'paused' | 'archived';
  dailyBudget: number;
  placement: string;
  startDate?: string;
  endDate?: string;
}

export interface OzonProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  status: string;
  visibility: string;
  stock: number;
}

export interface OzonProductInfoItem {
  product_id: string;
  name: string;
  offer_id: string;
  category: string;
  status: string;
  images: string[];
  visibility?: string;
  stock?: number;
  price?: number;
}

export interface OzonBudgetStats {
  campaignId: string;
  date: string;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

export interface OzonApiError {
  code: string;
  message: string;
  details?: any;
}

export interface OzonApiResponse<T> {
  result: T;
  error?: OzonApiError;
}

export interface OzonPerformanceCredentials {
  id: string; // UUID, первичный ключ таблицы ozon_performance_credentials
  user_id: string; // UUID, внешний ключ к auth.users
  name: string; // Название магазина/подключения
  ozon_client_id: string; // Client ID для Performance API
  ozon_client_secret: string; // Client Secret для Performance API
  created_at?: string;
  updated_at?: string;
} 