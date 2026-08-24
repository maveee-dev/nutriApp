import { apiClient } from '@/api/client';
import type {
  AuthMessage,
  User,
  LoginResponse,
  LoginRequest,
  RegisterRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../types/auth.types';

export const authApi = {
  login: (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', data);
  },

  register: (data: RegisterRequest): Promise<User> => {
    return apiClient.post('/auth/register', data);
  },

  verifyEmail: (data: VerifyEmailRequest): Promise<AuthMessage> => {
    return apiClient.post('/auth/verify-email', data);
  },

  resendVerification: (data: ResendVerificationRequest): Promise<AuthMessage> => {
    return apiClient.post('/auth/resend-verification', data);
  },

  forgotPassword: (data: ForgotPasswordRequest): Promise<AuthMessage> => {
    return apiClient.post('/auth/forgot-password', data);
  },

  resetPassword: (data: ResetPasswordRequest): Promise<AuthMessage> => {
    return apiClient.post('/auth/reset-password', data);
  },

  logout: (): Promise<AuthMessage> => {
    return apiClient.post('/auth/logout');
  },

  refresh: (): Promise<LoginResponse> => {
    return apiClient.post('/auth/refresh');
  },

  getMe: (): Promise<User> => {
    return apiClient.get('/auth/me');
  },
};
