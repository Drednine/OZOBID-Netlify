import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { OZON_API_CONFIG, RETRY_CONFIG, OZON_ERROR_CODES } from '../config/ozon';
import { OzonCredentials, OzonApiResponse, OzonApiError } from '../types/ozon';

export class OzonApiClient {
  private axiosInstance: AxiosInstance;
  private credentials: OzonCredentials;
  private retryCount: number = 0;

  constructor(credentials: OzonCredentials) {
    this.credentials = credentials;
    this.axiosInstance = axios.create({
      baseURL: OZON_API_CONFIG.BASE_URL,
      timeout: OZON_API_CONFIG.TIMEOUTS.DEFAULT,
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': credentials.clientId,
        'Api-Key': credentials.apiKey,
      },
    });

    // Добавляем перехватчик для обработки ошибок
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      this.handleRequestError.bind(this)
    );
  }

  private async handleRequestError(error: any) {
    const { config, response } = error;

    // Если превышено количество попыток, возвращаем ошибку
    if (this.retryCount >= RETRY_CONFIG.MAX_RETRIES) {
      this.retryCount = 0;
      throw this.formatError(error);
    }

    // Проверяем, нужно ли повторить запрос
    if (response && RETRY_CONFIG.RETRY_STATUS_CODES.includes(response.status)) {
      this.retryCount++;
      const delay = Math.min(
        RETRY_CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, this.retryCount - 1),
        RETRY_CONFIG.MAX_RETRY_DELAY
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.axiosInstance(config);
    }

    throw this.formatError(error);
  }

  private formatError(error: any): OzonApiError {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          return { code: OZON_ERROR_CODES.UNAUTHORIZED, message: 'Неверные учетные данные' };
        case 429:
          return { code: OZON_ERROR_CODES.RATE_LIMIT_EXCEEDED, message: 'Превышен лимит запросов' };
        case 400:
          return { 
            code: OZON_ERROR_CODES.INVALID_REQUEST, 
            message: data.message || 'Неверный запрос',
            details: data 
          };
        case 404:
          return { code: OZON_ERROR_CODES.PRODUCT_NOT_FOUND, message: 'Ресурс не найден' };
        default:
          return { 
            code: OZON_ERROR_CODES.SERVER_ERROR, 
            message: 'Ошибка сервера',
            details: data 
          };
      }
    }

    return { 
      code: 'network_error', 
      message: error.message || 'Ошибка сети' 
    };
  }

  protected async get<T>(endpoint: string, params?: any): Promise<OzonApiResponse<T>> {
    const config: AxiosRequestConfig = { params };
    const response = await this.axiosInstance.get(endpoint, config);
    return response.data;
  }

  protected async post<T>(endpoint: string, data?: any): Promise<OzonApiResponse<T>> {
    const response = await this.axiosInstance.post(endpoint, data);
    return response.data;
  }

  protected async put<T>(endpoint: string, data?: any): Promise<OzonApiResponse<T>> {
    const response = await this.axiosInstance.put(endpoint, data);
    return response.data;
  }

  protected async delete<T>(endpoint: string): Promise<OzonApiResponse<T>> {
    const response = await this.axiosInstance.delete(endpoint);
    return response.data;
  }
} 