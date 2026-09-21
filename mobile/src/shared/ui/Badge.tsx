import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, radius, spacing, typography } from '../design-system';

interface BadgeProps {
  label: string;
  tone?: 'primary' | 'success' | 'danger' | 'warning' | 'neutral';
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const colors: Record<string, { bg: string; fg: string }> = {
    primary: { bg: c.primarySoft, fg: c.primary },
    success: { bg: c.successSoft, fg: c.success },
    danger: { bg: c.dangerSoft, fg: c.danger },
    warning: { bg: c.dangerSoft, fg: c.warning },
    neutral: { bg: c.surfaceSecondary, fg: c.textSecondary },
  };
  const { bg, fg } = colors[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  text: { ...typography.caption, fontWeight: '600' },
});