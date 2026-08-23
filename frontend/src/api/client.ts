import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import type { ApiResponse, ErrorResponse } from './types';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Unwrap ApiResponse<T> -> T and handle standard errors
apiClient.interceptors.response.use(
  (response) => {
    // 204 No Content
    if (response.status === 204 || !response.data) {
      return response.data;
    }

    // Backend wraps response in { success: true, data: T, timestamp: string }
    const resData = response.data as ApiResponse<unknown>;
    if (resData && typeof resData === 'object' && 'data' in resData && resData.success === true) {
      return resData.data;
    }

    return response.data;
  },
  (error: AxiosError<ErrorResponse>) => {
    if (error.response) {
      const { status, data, config } = error.response;

      // Only force logout on 401 for authenticated session requests (not login/register attempts)
      const isAuthEndpoint = config?.url?.includes('/auth/login') || config?.url?.includes('/auth/register');
      if (status === 401 && !isAuthEndpoint) {
        useAuthStore.getState().logout();
      }

      // Format clean user-facing error message from backend ErrorResponse
      let message = 'An unexpected error occurred. Please try again.';
      if (data?.message) {
        if (Array.isArray(data.message)) {
          message = data.message.join(', ');
        } else if (typeof data.message === 'string') {
          message = data.message;
        }
      } else if (status === 401) {
        message = 'Invalid email or password. Please check your credentials.';
      } else if (status === 404) {
        message = 'The requested resource was not found.';
      } else if (status === 409) {
        message = 'An account with this email already exists.';
      } else if (status >= 500) {
        message = 'Server error. Please try again in a few moments.';
      }

      const err = new Error(message) as Error & { status?: number; response?: unknown; data?: unknown; url?: string };
      err.status = status;
      err.response = data;
      err.data = data;
      err.url = config?.url;
      return Promise.reject(err);
    }

    // Network error / server offline
    if (error.code === 'ERR_NETWORK' || !error.response) {
      const err = new Error('Unable to connect to the server. Please check your connection or make sure the backend is running.') as Error & { code?: string; url?: string };
      err.code = error.code;
      err.url = error.config?.url;
      return Promise.reject(err);
    }

    return Promise.reject(error);
  },
);
