/**
 * Design tokens — single source of truth for the app's visual language.
 * Dark "creator studio" aesthetic: near-black surfaces, violet → fuchsia
 * accents, soft borders, generous radii.
 */

export const colors = {
  bg: '#08080E',
  surface: '#0F0F17',
  card: '#14141E',
  cardAlt: '#1A1A26',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',

  text: '#F5F5F8',
  textMuted: '#A3A3B2',
  textDim: '#5F6170',

  primary: '#8B5CF6',
  primaryBright: '#A78BFA',
  accent: '#E879F9',

  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
  flame: '#FB7185',
} as const;

export const gradients = {
  primary: ['#7C3AED', '#C026D3'] as const,
  primarySoft: ['rgba(124,58,237,0.28)', 'rgba(192,38,211,0.08)'] as const,
  card: ['rgba(255,255,255,0.055)', 'rgba(255,255,255,0.015)'] as const,
  hero: ['rgba(124,58,237,0.35)', 'rgba(192,38,211,0.12)', 'rgba(8,8,14,0)'] as const,
  thumbnailScrim: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)'] as const,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Tab bar / header metrics shared across screens. */
export const layout = {
  screenPadding: 20,
  headerHeight: 56,
} as const;
