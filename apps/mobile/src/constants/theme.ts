/**
 * myVote Kenya - Design System Theme
 * Green-themed to match Kenya's national colors
 */

export const Colors = {
  light: {
    primary: '#16a34a',
    primaryDark: '#15803d',
    primaryLight: '#22c55e',
    primaryFaded: '#dcfce7',
    secondary: '#0ea5e9',
    secondaryDark: '#0284c7',
    background: '#ffffff',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    error: '#ef4444',
    errorLight: '#fee2e2',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    success: '#16a34a',
    successLight: '#dcfce7',
    info: '#0ea5e9',
    infoLight: '#e0f2fe',
    card: '#ffffff',
    skeleton: '#e2e8f0',
    tabBar: '#ffffff',
    tabBarInactive: '#94a3b8',
    overlay: 'rgba(0, 0, 0, 0.5)',
    white: '#ffffff',
    black: '#000000',
  },
  dark: {
    primary: '#22c55e',
    primaryDark: '#16a34a',
    primaryLight: '#4ade80',
    primaryFaded: '#052e16',
    secondary: '#38bdf8',
    secondaryDark: '#0ea5e9',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceElevated: '#334155',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textTertiary: '#64748b',
    border: '#334155',
    borderLight: '#1e293b',
    error: '#f87171',
    errorLight: '#450a0a',
    warning: '#fbbf24',
    warningLight: '#451a03',
    success: '#4ade80',
    successLight: '#052e16',
    info: '#38bdf8',
    infoLight: '#0c4a6e',
    card: '#1e293b',
    skeleton: '#334155',
    tabBar: '#1e293b',
    tabBarInactive: '#64748b',
    overlay: 'rgba(0, 0, 0, 0.7)',
    white: '#ffffff',
    black: '#000000',
  },
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export type ThemeColors = typeof Colors.light;
