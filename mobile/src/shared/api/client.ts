import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiErrorBody } from '../lib/types';
import { tokenStorage } from '../storage/storage';

// Base URL: Android emulator reaches host machine via 10.0.2.2.
// Override via EXPO_PUBLIC_API_URL for other environments.
const DEFAULT_BASE_URL = 'http://10.0.2.2:8000/api/v1';
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;

export class ApiError extends Error {
  code?: string;
  fields?: Record<string, string[]>;
  status?: number;
  constructor(message: string, code?: string, fields?: Record<string, string[]>, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fields = fields;
    this.status = status;
  }
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) throw new ApiError('No refresh token');
  try {
    const res = await axios.post(`${BASE_URL}/auth/refresh`, { refresh });
    const access = res.data.access as string;
    const newRefresh = res.data.refresh as string;
    tokenStorage.setTokens(access, newRefresh);
    return access;
  } catch (e) {
    tokenStorage.clear();
    throw e;
  }
}

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const access = tokenStorage.getAccess();
  if (access) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error?.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const access = await refreshPromise;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        // Refresh failed; auth state listener will handle logout.
        return Promise.reject(error);
      }
    }

    const body = error?.response?.data as ApiErrorBody | undefined;
    if (body) {
      const message =
        body.message ?? body.detail ?? body.error ?? 'Произошла ошибка. Попробуйте ещё раз.';
      return Promise.reject(new ApiError(message, body.error, body.fields, status));
    }
    return Promise.reject(new ApiError('Сетевая ошибка. Проверьте подключение.', undefined, undefined, status));
  },
);