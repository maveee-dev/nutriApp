import { create } from 'zustand';
import type { User } from '@/features/auth/types/auth.types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (accessToken: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
  initializeAuth: () => void;
}

const STORAGE_TOKEN_KEY = 'nutri_access_token';
const STORAGE_USER_KEY = 'nutri_user';

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem(STORAGE_TOKEN_KEY),
  user: (() => {
    const rawUser = localStorage.getItem(STORAGE_USER_KEY);
    if (rawUser) {
      try {
        return JSON.parse(rawUser) as User;
      } catch {
        return null;
      }
    }
    return null;
  })(),
  isLoading: false,

  setAuth: (accessToken: string, user: User) => {
    localStorage.setItem(STORAGE_TOKEN_KEY, accessToken);
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    set({ accessToken, user, isLoading: false });
  },

  setUser: (user: User) => {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
    set({ user });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    set({ accessToken: null, user: null, isLoading: false });
  },

  initializeAuth: () => {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    const rawUser = localStorage.getItem(STORAGE_USER_KEY);
    if (token && rawUser) {
      try {
        const user = JSON.parse(rawUser) as User;
        set({ accessToken: token, user, isLoading: false });
      } catch {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
        set({ accessToken: null, user: null, isLoading: false });
      }
    } else {
      set({ accessToken: null, user: null, isLoading: false });
    }
  },
}));
