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
          backgroundColor: c.glass,
          borderColor: c.glassBorder,
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
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
});