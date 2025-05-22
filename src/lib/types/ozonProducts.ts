export interface OzonProductListItem {
  product_id: string;
  offer_id?: string;
}

export interface OzonProductListResponse {
  items: OzonProductListItem[];
  total: number;
  last_id: string;
}

export interface OzonProductInfoItem {
  product_id: string;
  name: string;
  offer_id: string;
  category: string;
  status: string;
  images: string[];
}

export interface OzonProductInfoResponse {
  items: OzonProductInfoItem[];
}

export interface OzonProductPrice {
  product_id: string;
  price: {
    price: number;
    old_price: number;
  };
}

export interface OzonProductPriceResponse {
  items: OzonProductPrice[];
}

export interface OzonProductStock {
  product_id: string;
  stocks: Array<{
    type: string;
    present: number;
    reserved: number;
  }>;
}

export interface OzonProductStockResponse {
  items: OzonProductStock[];
} 