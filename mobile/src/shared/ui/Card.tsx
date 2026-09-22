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
          shadowColor: theme.dark ? '#000' : '#1E293B',
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
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});