// src/services/api.ts
import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

// Extract the base URL without the '/api' suffix for auth endpoints
const baseURL = import.meta.env.VITE_API_URL || '';
const baseServerURL = baseURL.endsWith('/api')
  ? baseURL.substring(0, baseURL.length - 4)
  : baseURL;

// API instance for regular API endpoints (with /api prefix)
export const api = axios.create({
  baseURL: baseURL,
  withCredentials: false,
  timeout: 10_000,
});

// API instance for auth endpoints (without /api prefix)
export const authApi = axios.create({
  baseURL: baseServerURL,
  withCredentials: false,
  timeout: 10_000,
});

// Add auth token to all requests
const addAuthToken = (cfg: import('axios').InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
};

api.interceptors.request.use(addAuthToken);
authApi.interceptors.request.use(addAuthToken);

// Handle authentication errors
const handleAuthErrors = (err: import('axios').AxiosError) => {
  // Only handle 401 Unauthorized errors by logging out
  // Do NOT handle 403 Forbidden errors here, as they should be handled by the specific API calls
  if (err.response?.status === 401) {
    const requestUrl = err.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
    const isCurrentlyAuthenticated = !!useAuthStore.getState().token;

    // Only auto-logout/redirect if:
    // 1. This is NOT an authentication endpoint (login/register)
    // 2. The user is currently authenticated (has a token)
    // This prevents logout on failed login attempts but handles expired tokens
    if (!isAuthEndpoint && isCurrentlyAuthenticated) {
      console.log('Received 401 Unauthorized response, logging out user');
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
  }
  return Promise.reject(err);
};

api.interceptors.response.use(res => res, handleAuthErrors);
authApi.interceptors.response.use(res => res, handleAuthErrors);
