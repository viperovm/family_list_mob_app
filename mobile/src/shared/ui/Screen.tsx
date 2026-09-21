import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme, spacing } from '../design-system';

export function Screen({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {children}
    </View>
  );
}

export function ScreenContent({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.content, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, padding: spacing.lg },
});