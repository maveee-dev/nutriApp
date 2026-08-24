import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/useAuthStore';
import type { ApiResponse, ErrorResponse } from './types';
import type { LoginResponse } from '@/features/auth/types/auth.types';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<LoginResponse | null> | null = null;

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
  async (error: AxiosError<ErrorResponse>) => {
    if (error.response) {
      const { status, data, config } = error.response;

      const requestConfig = config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
      const isAuthEndpoint = isAuthenticationEndpoint(config?.url);

      if (status === 401 && requestConfig && !requestConfig._retry && !isAuthEndpoint) {
        const refreshed = await awaitRefreshToken();

        if (refreshed) {
          requestConfig._retry = true;
          requestConfig.headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
          return apiClient(requestConfig);
        }

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

function isAuthenticationEndpoint(url?: string): boolean {
  if (!url) return false;

  // Login, registration, verification, password recovery, refresh, logout,
  // and OAuth endpoints must surface their own authentication errors. The
  // authenticated /auth/me endpoint is deliberately refreshable.
  const nonRefreshableEndpoints = [
    '/auth/login',
    '/auth/register',
    '/auth/verify-email',
    '/auth/resend-verification',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
    '/auth/logout',
    '/auth/google',
  ];

  return nonRefreshableEndpoints.some((endpoint) => url.includes(endpoint));
}

function unwrap<T>(response: AxiosResponse<ApiResponse<T> | T>): T {
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'success' in payload && payload.success === true && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

function awaitRefreshToken(): Promise<LoginResponse | null> {
  if (refreshPromise == null) {
    refreshPromise = refreshClient
      .post<ApiResponse<LoginResponse>>('/auth/refresh')
      .then((response) => {
        const data = unwrap(response);
        useAuthStore.getState().setAuth(data.accessToken, data.user);
        return data;
      })
      .catch(() => {
        useAuthStore.getState().logout();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
