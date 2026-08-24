import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import type { LoginRequest, RegisterRequest } from '../types/auth.types';

export const useLoginMutation = () => {
  const setAuth = useAuthStore((state) => state.setAuth);
  const showToast = useToastStore((state) => state.showToast);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user);
      queryClient.clear();
      showToast({
        type: 'success',
        title: 'Welcome back!',
        message: 'You have signed in successfully.',
      });
      const requestedDestination = new URLSearchParams(window.location.search).get('next');
      const destination = requestedDestination && requestedDestination.startsWith('/') && !requestedDestination.startsWith('//')
        ? requestedDestination
        : '/';
      navigate(destination);
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Sign in failed',
        message: error.message,
      });
    },
  });
};

export const useRegisterMutation = () => {
  const showToast = useToastStore((state) => state.showToast);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: (data) => {
      showToast({
        type: 'success',
        title: 'Account created!',
        message: 'Check your email for the verification code.',
      });
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        title: 'Registration failed',
        message: error.message,
      });
    },
  });
};

export const useLogout = () => {
  const clearAuth = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  return async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };
};
