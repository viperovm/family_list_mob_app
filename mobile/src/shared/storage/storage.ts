import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

const ACCESS_KEY = 'auth.access';
const REFRESH_KEY = 'auth.refresh';
const THEME_KEY = 'settings.theme';
const DEVICE_ID_KEY = 'device.id';

function randomId(): string {
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const tokenStorage = {
  getAccess: () => storage.getString(ACCESS_KEY) ?? null,
  getRefresh: () => storage.getString(REFRESH_KEY) ?? null,
  setTokens: (access: string, refresh: string) => {
    storage.set(ACCESS_KEY, access);
    storage.set(REFRESH_KEY, refresh);
  },
  clear: () => {
    storage.remove(ACCESS_KEY);
    storage.remove(REFRESH_KEY);
  },
};

export type ThemeMode = 'light' | 'dark' | 'system';

export const settingsStorage = {
  getTheme: (): ThemeMode => (storage.getString(THEME_KEY) as ThemeMode) ?? 'system',
  setTheme: (mode: ThemeMode) => storage.set(THEME_KEY, mode),
};

export const deviceStorage = {
  getDeviceId: (): string => {
    const existing = storage.getString(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = randomId();
    storage.set(DEVICE_ID_KEY, id);
    return id;
  },
};
