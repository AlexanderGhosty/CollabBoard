import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';

type User = { id: string; email: string };

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
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

      logout() {
        set({ token: null, user: null });
      },
    }),
    { name: 'auth', partialize: (s) => ({ token: s.token, user: s.user }) },
  ),
);
