import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, spacing, typography } from '../design-system';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, subtitle, icon = '📋', action }: EmptyStateProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xxl,
  },
  icon: { fontSize: 48, marginBottom: spacing.lg },
  title: { ...typography.titleMedium, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { ...typography.bodyMedium, textAlign: 'center' },
  action: { marginTop: spacing.xl, alignSelf: 'stretch' },
});