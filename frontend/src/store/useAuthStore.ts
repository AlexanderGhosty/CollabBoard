import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

/** Данные, которые бэкенд возвращает после авторизации / регистрации */
type User = { id: string; email: string };

interface AuthState {
  /** JWT access‑токен */
  token: string | null;
  user: User | null;

  /** Авторизация */
  login: (email: string, password: string) => Promise<void>;
  /** Регистрация */
  register: (email: string, password: string) => Promise<void>;
  /** Выход из системы */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,

      async login(email, password) {
        const { data } = await api.post('/auth/login', { email, password });
        set({ token: data.token, user: data.user });
      },

      async register(email, password) {
        const { data } = await api.post('/auth/register', { email, password });
        set({ token: data.token, user: data.user });
      },

      logout() {
        set({ token: null, user: null });
      },
    }),
    {
      /* храним auth‑данные между перезагрузками */
      name: 'auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);
