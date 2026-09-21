import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiErrorBody } from '../lib/types';
import { tokenStorage } from '../storage/storage';

// Base URL боевого сервера (production). Для локальной разработки
// переопределите через переменную окружения EXPO_PUBLIC_API_URL, например:
//   EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1  (Android-эмулятор → хост)
const PRODUCTION_BASE_URL = 'https://listsapp.djangopirate.ru/api/v1';
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_BASE_URL;

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

function parseApiErrorBody(body: ApiErrorBody): {
  message: string;
  code?: string;
  fields?: Record<string, string[]>;
} {
  const nested =
    typeof body.error === 'object' && body.error !== null ? body.error : null;

  const message =
    nested?.message ??
    body.message ??
    body.detail ??
    (typeof body.error === 'string' ? body.error : undefined) ??
    'Произошла ошибка. Попробуйте ещё раз.';

  const code = nested?.code ?? (typeof body.error === 'string' ? body.error : undefined);
  const fields = nested?.fields ?? body.fields;

  return { message, code, fields };
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
      const { message, code, fields } = parseApiErrorBody(body);
      return Promise.reject(new ApiError(message, code, fields, status));
    }
    return Promise.reject(new ApiError('Сетевая ошибка. Проверьте подключение.', undefined, undefined, status));
  },
);