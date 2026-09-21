import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { makeTheme, Theme } from './theme';
import { settingsStorage, ThemeMode } from '../storage/storage';

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(() => settingsStorage.getTheme());

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    settingsStorage.setTheme(m);
  };

  const toggle = () => {
    const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
    setMode(dark ? 'light' : 'dark');
  };

  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const theme = useMemo(() => makeTheme(isDark), [isDark]);

  const value = useMemo(
    () => ({ theme, mode, setMode, toggle }),
    [theme, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
