import React from 'react';
import { StyleSheet, Pressable, Text, View } from 'react-native';
import { useTheme, spacing, typography } from '../design-system';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: c.glass, borderColor: c.glassBorder }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && { backgroundColor: c.primary }]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? '#fff' : c.textSecondary },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: spacing.xs,
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
  },
  label: { ...typography.bodyMedium, fontWeight: '600' },
});