import { OzonCampaignApi } from './ozonCampaignApi';
import { OzonProductApi } from './ozonProductApi';
import { OzonCredentials } from '../types/ozon';

// Создаем экземпляры API клиентов
export const createApiClients = (credentials: OzonCredentials) => {
  return {
    campaigns: new OzonCampaignApi(credentials),
    products: new OzonProductApi(credentials),
  };
};

// Функции для работы с кампаниями
export const getCampaignsList = async (credentials: OzonCredentials) => {
  const api = createApiClients(credentials);
  try {
    const campaigns = await api.campaigns.getCampaigns();
    return { data: { campaigns }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateCampaignBudget = async (
  credentials: OzonCredentials,
  campaignId: string,
  budget: number
) => {
  const api = createApiClients(credentials);
  try {
    await api.campaigns.updateCampaignBudget(campaignId, budget);
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const checkAndDisableCampaignsIfBudgetExceeded = async (
  credentials: OzonCredentials,
  performanceCredentials: OzonCredentials,
  dailyLimit: number,
  autoDisable: boolean
) => {
  if (!autoDisable) return { data: null, error: null };

  const api = createApiClients(credentials);
  try {
    const today = new Date().toISOString().split('T')[0];
    const totalSpent = await api.campaigns.getDailySpending(today);
    
    if (totalSpent >= dailyLimit) {
      await api.campaigns.checkAndDisableCampaigns(dailyLimit);
      return {
        data: {
          totalSpent,
          budgetExceeded: true,
          lastChecked: new Date().toISOString()
        },
        error: null
      };
    }

    return {
      data: {
        totalSpent,
        budgetExceeded: false,
        lastChecked: new Date().toISOString()
      },
      error: null
    };
  } catch (error) {
    return { data: null, error };
  }
};

// Функции для работы с товарами
export const getProductsList = async (credentials: OzonCredentials) => {
  const api = createApiClients(credentials);
  try {
    const products = await api.products.getProducts();
    return { data: { products }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getLowStockProducts = async (
  credentials: OzonCredentials,
  threshold: number = 5
) => {
  const api = createApiClients(credentials);
  try {
    const products = await api.products.getLowStockProducts(threshold);
    return { data: { products }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateProductVisibility = async (
  credentials: OzonCredentials,
  productId: string,
  visibility: 'visible' | 'invisible'
) => {
  const api = createApiClients(credentials);
  try {
    await api.products.updateProductsVisibility([productId], visibility);
    return { error: null };
  } catch (error) {
    return { error };
  }
}; 