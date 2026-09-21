import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, spacing, typography } from '../design-system';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Не удалось загрузить данные',
  onRetry,
}: ErrorStateProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: c.textPrimary }]}>{message}</Text>
      {onRetry ? (
        <View style={styles.action}>
          <Button title="Повторить" variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
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
  icon: { fontSize: 40, marginBottom: spacing.lg },
  title: { ...typography.bodyLarge, textAlign: 'center' },
  action: { marginTop: spacing.xl, alignSelf: 'stretch' },
});