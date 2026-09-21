export interface ColorScheme {
  background: string;
  surface: string;
  surfaceSecondary: string;
  glass: string;
  glassBorder: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  border: string;
  overlay: string;
  gradientStart: string;
  gradientEnd: string;
}

export const lightColors: ColorScheme = {
  background: '#EEF2FB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F5FC',
  glass: 'rgba(255, 255, 255, 0.78)',
  glassBorder: 'rgba(255, 255, 255, 0.85)',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  primarySoft: '#DBEAFE',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  warning: '#D97706',
  border: '#E5EAF3',
  overlay: 'rgba(15, 23, 42, 0.4)',
  gradientStart: '#3B82F6',
  gradientEnd: '#22D3EE',
};

export const darkColors: ColorScheme = {
  background: '#0B1220',
  surface: '#111827',
  surfaceSecondary: '#182338',
  glass: 'rgba(17, 24, 39, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  primary: '#3B82F6',
  primaryPressed: '#2563EB',
  primarySoft: '#1D3A63',
  success: '#22C55E',
  successSoft: '#12351E',
  danger: '#EF4444',
  dangerSoft: '#421C1C',
  warning: '#F59E0B',
  border: '#263043',
  overlay: 'rgba(0, 0, 0, 0.55)',
  gradientStart: '#3B82F6',
  gradientEnd: '#22D3EE',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  input: 16,
  button: 18,
  card: 24,
  bottomSheet: 28,
  dialog: 24,
  chip: 999,
} as const;

export const typography = {
  titleLarge: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  titleMedium: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  bodyLarge: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' as const },
} as const;

export type Theme = {
  dark: boolean;
  colors: ColorScheme;
};

export function makeTheme(dark: boolean): Theme {
  return { dark, colors: dark ? darkColors : lightColors };
}
