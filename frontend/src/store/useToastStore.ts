import { create } from 'zustand';
import { ToastType } from '@/components/molecules/Toast';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;

  // Convenience methods for common toast types
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  warning: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    // Generate a unique ID by combining timestamp with a random suffix
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  success: (message, duration) => {
    return get().addToast({ message, type: 'success', duration });
  },

  error: (message, duration) => {
    return get().addToast({ message, type: 'error', duration });
  },

  warning: (message, duration) => {
    return get().addToast({ message, type: 'warning', duration });
  },

  info: (message, duration) => {
    return get().addToast({ message, type: 'info', duration });
  },
}));
