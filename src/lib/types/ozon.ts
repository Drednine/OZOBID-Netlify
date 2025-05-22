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