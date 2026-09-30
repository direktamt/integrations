import axios, { AxiosInstance, isAxiosError } from 'axios';
import { ApiError } from './ApiError';

/**
 * Shape of the integrations API error body.
 */
interface IntegrationsApiErrorBody {
  statusCode?: number;
  error?: string;
  message?: string | string[];
}

/**
 * Typed axios wrapper: base URL from VITE_API_BASE_URL, JSON only,
 * all failures normalized into ApiError.
 */
export class ApiClient {
  private readonly http: AxiosInstance;

  constructor(
    baseUrl: string = import.meta.env.VITE_API_BASE_URL ??
      'http://localhost:3000',
  ) {
    this.http = axios.create({
      baseURL: baseUrl,
      headers: { Accept: 'application/json' },
    });
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const response = await this.http.get<T>(path, { params });
      return response.data;
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  private toApiError(error: unknown): ApiError {
    if (isAxiosError<IntegrationsApiErrorBody>(error)) {
      const status = error.response?.status ?? 0;
      const message = error.response?.data?.message;
      const details =
        message === undefined
          ? [error.message]
          : Array.isArray(message)
            ? message
            : [message];
      return new ApiError(status, details);
    }
    return new ApiError(0, [String(error)]);
  }
}

export const apiClient = new ApiClient();
