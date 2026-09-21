import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme, ThemeProvider } from '../../shared/design-system';
import { RootNavigator } from '../navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemedNavigation() {
  const { theme } = useTheme();
  const navTheme = theme.dark ? DarkTheme : DefaultTheme;
  return (
    <NavigationContainer
      theme={{
        ...navTheme,
        colors: {
          ...navTheme.colors,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.textPrimary,
          border: theme.colors.border,
          primary: theme.colors.primary,
        },
      }}
    >
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function App() {
  return (
    <AppProviders>
      <ThemedNavigation />
    </AppProviders>
  );
}
