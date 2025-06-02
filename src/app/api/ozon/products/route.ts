import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

interface OzonProductListItem {
  product_id: number;
  offer_id: string;
}

interface OzonProductListResponse {
  result: {
    items: OzonProductListItem[];
    last_id: string;
    total: number;
  };
}

interface OzonProductInfo {
  id: number;
  name: string;
  offer_id: string;
  barcode: string;
  category_id: number;
  description: string;
  primary_image?: string;
  images_360?: string[];
  color_image?: string;
  [key: string]: any;
}

interface OzonProductInfoListResponse {
  result: {
    items: OzonProductInfo[];
  };
}

interface OzonProductPriceInfo {
  product_id: number;
  offer_id: string;
  price: {
    price: string;
    old_price: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface OzonProductPricesResponse {
  result: {
    items: OzonProductPriceInfo[];
  };
}

interface OzonProductStockInfo {
  product_id: number;
  offer_id: string;
  stocks: {
    present: number;
    reserved: number;
    type: "fbo" | "fbs" | "crossborder";
    [key: string]: any;
  }[];
}

interface OzonProductStocksResponse {
  result: {
    items: OzonProductStockInfo[];
  };
}

interface OzonProductPicturesInfoItem {
  product_id: number;
  primary_photo: string[];
  photo: string[];
  color_photo: string[];
  photo_360: string[];
  errors: any[];
}

interface OzonProductPicturesInfoResponse {
  result: {
    items: OzonProductPicturesInfoItem[];
  };
}

export interface AggregatedProduct {
  product_id: number;
  offer_id: string;
  name: string;
  images: string[];
  price: number;
  old_price: number;
  totalStock: number;
  category_id: number;
  barcode: string;
  description: string;
  stocks_by_type?: { fbo: number; fbs: number; crossborder: number };
}

const OZON_API_TIMEOUT = 25000;
const MAX_IDS_PER_REQUEST = 500;

async function batchRequest<T, R>(
  items: T[],
  url: string,
  method: string,
  headers: Record<string, string>,
  bodyGenerator: (batch: T[]) => Record<string, any>,
  batchSize: number
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(bodyGenerator(batch)),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error in batchRequest to ${url} (batch starting with ${JSON.stringify(batch[0])}): ${response.status} ${response.statusText}`,
          errorText
        );
        continue;
      }
      const data = await response.json();
      if (data.result && Array.isArray(data.result.items)) {
        results.push(...data.result.items);
      } else if (data.result && !Array.isArray(data.result.items) && Array.isArray(data.result)) {
        results.push(...(data.result.items || data.result));
      } else if (Array.isArray(data.items)) {
        console.log(`batchRequest: Detected data.items structure for ${url}`);
        results.push(...data.items);
      } else {
        console.warn(`Unexpected data structure from ${url} for batch:`, data);
      }
    } catch (error) {
      console.error(`Network error or JSON parsing error in batchRequest to ${url}:`, error);
    }
  }
  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { clientId, apiKey, pageSize = 100, lastId = "" } = await request.json();

    if (!clientId || !apiKey) {
      return NextResponse.json({ error: "Client ID and API Key are required" }, { status: 400 });
    }

    const headers = {
      "Client-Id": clientId,
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    };

    const productListResponse = await fetch("https://api-seller.ozon.ru/v3/product/list", {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter: { visibility: "ALL" },
        limit: pageSize,
        last_id: lastId,
      }),
    });

    if (!productListResponse.ok) {
      const errorText = await productListResponse.text();
      console.error("Error fetching product list:", errorText);
      return NextResponse.json({ error: "Failed to fetch product list from Ozon", details: errorText }, { status: productListResponse.status });
    }

    const productListData = (await productListResponse.json()) as OzonProductListResponse;
    const productItems = productListData.result?.items || [];
    const nextLastId = productListData.result?.last_id || "";
    const totalItems = productListData.result?.total || 0;

    if (productItems.length === 0) {
      return NextResponse.json({ items: [], last_id: nextLastId, total_items: totalItems });
    }

    const productIds = productItems.map((item) => item.product_id);
    const offerIds = productItems.map((item) => item.offer_id);

    const productInfoData = await batchRequest<number, OzonProductInfo>(
      productIds,
      "https://api-seller.ozon.ru/v3/product/info/list",
      "POST",
      headers,
      (batch) => ({ product_id: batch }),
      500
    );
    console.log("Raw productInfoData from Ozon:", JSON.stringify(productInfoData, null, 2));

    const productPriceData = await batchRequest<number, OzonProductPriceInfo>(
      productIds,
      "https://api-seller.ozon.ru/v5/product/info/prices",
      "POST",
      headers,
      (batch) => ({
         filter: { product_id: batch.map(String), visibility: "ALL" }, 
         limit: batch.length 
        }), 
      1000
    );
    console.log("Raw productPriceData from Ozon:", JSON.stringify(productPriceData, null, 2));

    console.log("Fetching product stocks for IDs:", productIds);
    const productStockData = await batchRequest<number, OzonProductStockInfo>(
      productIds,
      "https://api-seller.ozon.ru/v4/product/info/stocks",
      "POST",
      headers,
      (batch) => ({
        filter: { product_id: batch.map(String), visibility: "ALL" },
        limit: batch.length
      }),
      1000
    );
    console.log("Raw productStockData from Ozon:", JSON.stringify(productStockData, null, 2));

    const productPicturesData = await batchRequest<number, OzonProductPicturesInfoItem>(
      productIds,
      "https://api-seller.ozon.ru/v2/product/pictures/info",
      "POST",
      headers,
      (batch) => ({ product_id: batch.map(String) }),
      1000
    );
    console.log("Raw productPicturesData from Ozon:", JSON.stringify(productPicturesData, null, 2));

    const aggregatedProducts: AggregatedProduct[] = productItems.map((listItem) => {
      const info = productInfoData.find((p) => p.id === listItem.product_id);
      const priceInfo = productPriceData.find((p) => p.product_id === listItem.product_id);
      const stockInfo = productStockData.find((p) => p.product_id === listItem.product_id);
      const picturesInfo = productPicturesData.find((p) => p.product_id === listItem.product_id);

      const name = info?.name || "Без названия";
      if (!info?.name) {
        console.warn(`Product ID ${listItem.product_id} (Offer ID: ${listItem.offer_id}) has no name. Info:`, info);
      }
      
      const images: string[] = [];
      if (picturesInfo) {
        if (picturesInfo.primary_photo && picturesInfo.primary_photo.length > 0) {
          images.push(...picturesInfo.primary_photo);
        } else if (picturesInfo.photo && picturesInfo.photo.length > 0) {
          images.push(...picturesInfo.photo);
        }
      }
      if (images.length === 0) {
        console.warn(`Product ID ${listItem.product_id} (Offer ID: ${listItem.offer_id}) has no images. PicturesInfo:`, picturesInfo);
      }

      const price = parseFloat(priceInfo?.price?.price || "0");
      const old_price = parseFloat(priceInfo?.price?.old_price || "0");
      if (!priceInfo?.price?.price) {
        console.warn(`Product ID ${listItem.product_id} (Offer ID: ${listItem.offer_id}) has no price. PriceInfo:`, priceInfo);
      }

      let totalStock = 0;
      const stocks_by_type: AggregatedProduct['stocks_by_type'] = { fbo: 0, fbs: 0, crossborder: 0 };
      if (stockInfo && stockInfo.stocks) {
        stockInfo.stocks.forEach(s => {
          const currentStock = Number(s.present) || 0;
          totalStock += currentStock;
          if (s.type) {
            stocks_by_type[s.type] = (stocks_by_type[s.type] || 0) + currentStock;
          }
        });
      } else {
        console.warn(`Product ID ${listItem.product_id} (Offer ID: ${listItem.offer_id}) has no stock info or empty stocks. StockInfo:`, stockInfo);
      }
      if (totalStock === 0 && stockInfo && stockInfo.stocks && stockInfo.stocks.length > 0) {
        console.log(`Product ID ${listItem.product_id} (Offer ID: ${listItem.offer_id}) calculated totalStock is 0, but has stock entries. StockInfo:`, stockInfo);
      }

      return {
        product_id: listItem.product_id,
        offer_id: listItem.offer_id,
        name: name,
        images: images,
        price: price,
        old_price: old_price,
        totalStock: totalStock,
        category_id: info?.category_id || 0,
        barcode: info?.barcode || "",
        description: info?.description || "",
        stocks_by_type: stocks_by_type,
      };
    });

    console.log("First aggregated product sample:", JSON.stringify(aggregatedProducts[0], null, 2));

    return NextResponse.json({
      items: aggregatedProducts,
      last_id: nextLastId,
      total_items: totalItems,
    });
  } catch (error: any) {
    console.error('API ozon/products (v2): Unhandled error in POST handler:', error.message);
    if (error.response) {
      console.error('API ozon/products (v2): Ozon API Error Response (unhandled):', error.response.data);
      return NextResponse.json({ error: 'Error from Ozon API (unhandled)', details: error.response.data }, { status: error.response.status || 500 });
    }
    return NextResponse.json({ error: 'Internal server error while fetching and aggregating products', details: error.message }, { status: 500 });
  }
} 