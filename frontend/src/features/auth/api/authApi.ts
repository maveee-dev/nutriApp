import { apiClient } from '@/api/client';
import type { User, LoginResponse, LoginRequest, RegisterRequest } from '../types/auth.types';

export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', data);
  },

  register: (data: RegisterRequest): Promise<User> => {
    return apiClient.post('/auth/register', data);
  },

  getMe: (): Promise<User> => {
    return apiClient.get('/auth/me');
  },
};
