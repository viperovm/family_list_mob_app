import React, { useEffect } from 'react';
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import './src/shared/i18n';
import { App } from './src/core/providers/AppProviders';
import { useAuthStore } from './src/features/auth/store';
import { authApi } from './src/shared/api/auth';
import { registerForPushNotifications } from './src/shared/lib/pushNotifications';

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
      void registerForPushNotifications();
    }
  }, [isHydrated, isAuthenticated]);

  return <App />;
}

export default Root;
