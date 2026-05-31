export const Colors = {
  // Core palette — pure monochrome
  black: '#0a0a0a',
  nearBlack: '#111111',
  darkGray: '#1a1a1a',
  midDark: '#242424',
  gray: '#333333',
  midGray: '#555555',
  lightGray: '#888888',
  silver: '#aaaaaa',
  offWhite: '#d4d4d4',
  white: '#f5f5f5',
  pureWhite: '#ffffff',

  // Semantic aliases
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceRaised: '#242424',
  border: '#2a2a2a',
  borderLight: '#333333',
  text: '#f5f5f5',
  textSecondary: '#888888',
  textMuted: '#555555',
  accent: '#ffffff',
  danger: '#555555',
} as const;

export const Typography = {
  // Font sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 30,
  '3xl': 38,
  '4xl': 48,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,

  // Letter spacing
  tight: -0.5,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;
