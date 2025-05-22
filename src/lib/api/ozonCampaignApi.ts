import { OzonApiClient } from './ozonApiClient';
import { OZON_API_CONFIG } from '../config/ozon';
import { OzonCampaign, OzonBudgetStats } from '../types/ozon';

export class OzonCampaignApi extends OzonApiClient {
  // Получить список кампаний
  async getCampaigns(): Promise<OzonCampaign[]> {
    const response = await this.get<{ campaigns: OzonCampaign[] }>(
      OZON_API_CONFIG.ENDPOINTS.CAMPAIGNS_LIST
    );
    return response.result.campaigns;
  }

  // Получить информацию о кампании
  async getCampaignInfo(campaignId: string): Promise<OzonCampaign> {
    const response = await this.get<{ campaign: OzonCampaign }>(
      `${OZON_API_CONFIG.ENDPOINTS.CAMPAIGN_INFO}/${campaignId}`
    );
    return response.result.campaign;
  }

  // Обновить бюджет кампании
  async updateCampaignBudget(campaignId: string, dailyBudget: number): Promise<void> {
    await this.put(OZON_API_CONFIG.ENDPOINTS.BUDGET_UPDATE, {
      campaign_id: campaignId,
      daily_budget: dailyBudget
    });
  }

  // Изменить статус кампании (активировать/приостановить)
  async updateCampaignState(campaignId: string, state: 'active' | 'paused'): Promise<void> {
    await this.post(OZON_API_CONFIG.ENDPOINTS.CAMPAIGN_STATE, {
      campaign_id: campaignId,
      state
    });
  }

  // Получить статистику расходов
  async getBudgetStats(campaignId: string, dateFrom: string, dateTo: string): Promise<OzonBudgetStats[]> {
    const response = await this.get<{ stats: OzonBudgetStats[] }>(
      OZON_API_CONFIG.ENDPOINTS.BUDGET_STATS,
      {
        campaign_id: campaignId,
        date_from: dateFrom,
        date_to: dateTo
      }
    );
    return response.result.stats;
  }

  // Получить общие расходы за день
  async getDailySpending(date: string): Promise<number> {
    const response = await this.get<{ total_spent: number }>(
      OZON_API_CONFIG.ENDPOINTS.STATISTICS,
      { date }
    );
    return response.result.total_spent;
  }

  // Проверить и отключить кампании при превышении бюджета
  async checkAndDisableCampaigns(dailyLimit: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const totalSpent = await this.getDailySpending(today);

    if (totalSpent >= dailyLimit) {
      const campaigns = await this.getCampaigns();
      const activeCampaigns = campaigns.filter(c => c.state === 'active');

      for (const campaign of activeCampaigns) {
        await this.updateCampaignState(campaign.id, 'paused');
      }
    }
  }
} 