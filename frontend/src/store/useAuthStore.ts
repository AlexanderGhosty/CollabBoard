import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

/** Данные, которые бэкенд возвращает после авторизации / регистрации */
type User = {
  id: string | number; // Accept both string and number types for ID
  name: string;
  email: string;
};

interface AuthState {
  /** JWT access‑токен */
  token: string | null;
  user: User | null;

  /** Авторизация */
  login: (email: string, password: string) => Promise<void>;
  /** Регистрация */
  register: (name: string, email: string, password: string) => Promise<void>;
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
        // Ensure user.id is converted to string for consistency in the frontend
        const user = {
          ...data.user,
          id: String(data.user.id)
        };
        set({ token: data.token, user });
      },

      async register(name, email, password) {
        const { data } = await api.post('/auth/register', { name, email, password });
        // Ensure user.id is converted to string for consistency in the frontend
        const user = {
          ...data.user,
          id: String(data.user.id)
        };
        set({ token: data.token, user });
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
