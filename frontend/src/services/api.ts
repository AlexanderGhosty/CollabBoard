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
const addAuthToken = (cfg: any) => {
  const token = useAuthStore.getState().token;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
};

api.interceptors.request.use(addAuthToken);
authApi.interceptors.request.use(addAuthToken);

// Handle 401 errors
const handle401 = (err: any) => {
  if (err.response?.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
  }
  return Promise.reject(err);
};

api.interceptors.response.use(res => res, handle401);
authApi.interceptors.response.use(res => res, handle401);
