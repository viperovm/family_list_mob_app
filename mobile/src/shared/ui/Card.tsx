import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useTheme, radius, spacing } from '../design-system';

export function Card({ children, style, ...rest }: ViewProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
          shadowColor: theme.dark ? '#000' : '#111827',
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: spacing.lg,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
});