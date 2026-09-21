import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';
import { useTheme, spacing } from '../design-system';

interface ScreenProps {
  children: React.ReactNode;
  /** Safe-area edges to inset. Use ['top'] for screens with a hidden header. */
  edges?: Edge[];
}

export function Screen({ children, edges = [] }: ScreenProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: c.background }]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="screenBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor={c.gradientStart} stopOpacity={theme.dark ? 0.22 : 0.16} />
            <Stop offset="0.45" stopColor={c.gradientEnd} stopOpacity={theme.dark ? 0.14 : 0.1} />
            <Stop offset="1" stopColor={c.background} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#screenBg)" />
      </Svg>
      <View style={styles.fill}>{children}</View>
    </SafeAreaView>
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
  fill: { flex: 1 },
  content: { flex: 1, padding: spacing.lg },
});