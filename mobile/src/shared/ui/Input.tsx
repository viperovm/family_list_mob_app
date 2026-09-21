import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useTheme, radius, spacing, typography } from '../design-system';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ label, error, style, ...rest }, ref) => {
    const { theme } = useTheme();
    const c = theme.colors;

    return (
      <View style={styles.wrapper}>
        {label ? (
          <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: c.surface,
              borderColor: error ? c.danger : c.border,
              color: c.textPrimary,
            },
            style,
          ]}
          {...rest}
        />
        {error ? (
          <Text style={[styles.error, { color: c.danger }]}>{error}</Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: { alignSelf: 'stretch', marginBottom: spacing.lg },
  label: { ...typography.caption, marginBottom: spacing.sm },
  input: {
    height: 52,
    borderRadius: radius.input,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    ...typography.bodyLarge,
  },
  error: { ...typography.caption, marginTop: spacing.sm },
});