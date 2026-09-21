import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import './src/shared/i18n';
import { App } from './src/core/providers/AppProviders';
import { useAuthStore } from './src/features/auth/store';
import { authApi } from './src/shared/api/auth';

function Root() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      authApi
        .me()
        .then(setUser)
        .catch(() => logout());
    }
  }, [isHydrated, isAuthenticated]);

  return (
    <>
      <StatusBar style="auto" />
      <App />
    </>
  );
}

export default Root;
