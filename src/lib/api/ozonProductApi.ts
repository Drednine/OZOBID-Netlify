import { OzonApiClient } from './ozonApiClient';
import { OZON_API_CONFIG } from '../config/ozon';
import { OzonProduct } from '../types/ozon';

export class OzonProductApi extends OzonApiClient {
  // Получить список товаров
  async getProducts(page: number = 1, pageSize: number = 100): Promise<OzonProduct[]> {
    const response = await this.post<{ items: OzonProduct[] }>(
      OZON_API_CONFIG.ENDPOINTS.PRODUCTS_LIST,
      {
        page,
        page_size: pageSize
      }
    );
    return response.result.items;
  }

  // Получить информацию о товаре
  async getProductInfo(productId: string): Promise<OzonProduct> {
    const response = await this.post<{ result: OzonProduct }>(
      OZON_API_CONFIG.ENDPOINTS.PRODUCT_INFO,
      {
        product_id: productId
      }
    );
    return response.result;
  }

  // Обновить информацию о товаре
  async updateProduct(productId: string, updateData: Partial<OzonProduct>): Promise<void> {
    await this.post(OZON_API_CONFIG.ENDPOINTS.PRODUCT_UPDATE, {
      product_id: productId,
      ...updateData
    });
  }

  // Получить товары с низким остатком
  async getLowStockProducts(threshold: number = 5): Promise<OzonProduct[]> {
    const allProducts = await this.getProducts();
    return allProducts.filter(product => product.stock <= threshold);
  }

  // Получить неактивные товары
  async getInactiveProducts(): Promise<OzonProduct[]> {
    const allProducts = await this.getProducts();
    return allProducts.filter(product => product.visibility === 'invisible');
  }

  // Получить товары по SKU
  async getProductsBySku(skuList: string[]): Promise<OzonProduct[]> {
    const products: OzonProduct[] = [];
    
    for (const sku of skuList) {
      try {
        const product = await this.post<{ result: OzonProduct }>(
          OZON_API_CONFIG.ENDPOINTS.PRODUCT_INFO,
          { sku }
        );
        products.push(product.result);
      } catch (error) {
        console.error(`Ошибка при получении товара с SKU ${sku}:`, error);
      }
    }

    return products;
  }

  // Обновить видимость товаров
  async updateProductsVisibility(productIds: string[], visibility: 'visible' | 'invisible'): Promise<void> {
    for (const productId of productIds) {
      try {
        await this.updateProduct(productId, { visibility });
      } catch (error) {
        console.error(`Ошибка при обновлении видимости товара ${productId}:`, error);
      }
    }
  }
} 