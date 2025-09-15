import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { toast } from 'react-toastify';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30초로 증가
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add user ID header for services that need it
        const userId = localStorage.getItem('userId');
        if (userId) {
          config.headers['x-user-id'] = userId;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 unauthorized errors
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.client.post('/api/auth/refresh', {
                refreshToken,
              });

              const { accessToken } = response.data;
              localStorage.setItem('accessToken', accessToken);

              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.logout();
            window.location.href = '/login';
          }
        }

        // Handle other errors
        const message = error.response?.data?.message || error.message || 'An error occurred';
        
        // Don't show toast for certain status codes
        if (![401, 404].includes(error.response?.status)) {
          toast.error(message);
        }

        return Promise.reject(error);
      }
    );
  }

  private logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
  }

  // Generic HTTP methods
  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T = any>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch(url, data);
    return response.data;
  }

  // File upload method
  async uploadFile<T = any>(url: string, file: File, additionalData?: any): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        formData.append(key, typeof additionalData[key] === 'object' 
          ? JSON.stringify(additionalData[key]) 
          : additionalData[key]
        );
      });
    }

    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Service-specific API clients
export const authApi = new ApiClient('http://localhost:3001'); // Users service
export const searchApi = new ApiClient('http://localhost:3003'); // Search service
export const ingestionApi = new ApiClient('http://localhost:3004'); // Ingestion service
export const graphApi = new ApiClient('http://localhost:3002'); // Graph service