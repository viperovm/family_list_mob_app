import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme, radius, spacing, typography } from '../design-system';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const isDisabled = disabled || loading;

  const backgrounds: Record<Variant, string> = {
    primary: c.primary,
    secondary: c.surfaceSecondary,
    ghost: 'transparent',
    danger: c.danger,
  };
  const textColors: Record<Variant, string> = {
    primary: '#FFFFFF',
    secondary: c.textPrimary,
    ghost: c.primary,
    danger: '#FFFFFF',
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: backgrounds[variant] },
        variant === 'primary' && pressed && !isDisabled && styles.pressed,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {variant === 'primary' && !isDisabled ? (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="btnPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0" stopColor={c.gradientStart} />
              <Stop offset="1" stopColor={c.gradientEnd} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" rx={radius.button} fill="url(#btnPrimary)" />
        </Svg>
      ) : null}
      {loading ? (
        <ActivityIndicator color={textColors[variant]} />
      ) : (
        <Text style={[styles.text, { color: textColors[variant] }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9 },
  text: { ...typography.button },
});