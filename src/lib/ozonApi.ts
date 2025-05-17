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

// ✅ Новый экспорт: обновление бюджета кампании
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
