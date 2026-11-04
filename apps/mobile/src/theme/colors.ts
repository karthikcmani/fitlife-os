export const darkColors = {
  // Surfaces
  background: '#121212',
  surface: '#1E1E1E',
  surfaceElevated: '#282828',
  surfaceHighlight: '#323232',
  border: '#2C2C2C',
  borderLight: '#3D3D3D',

  // Brand Accents
  primary: '#34D399', // Electric Emerald
  primaryDark: '#059669',
  secondary: '#60A5FA', // Calm Cobalt (Hydration / Water)
  accent: '#A78BFA', // Purple (Sleep / Recovery)
  warning: '#F59E0B', // Amber (PR / Achievements)
  danger: '#EF4444', // Crimson (Failure / Delete)

  // Typography
  text: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA', // Zinc 400
  textMuted: '#71717A', // Zinc 500
  textInverse: '#121212',

  // Interactive
  buttonDisabled: '#3F3F46',
  buttonDisabledText: '#71717A',
};

export const lightColors = {
  // Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceHighlight: '#E2E8F0',
  border: '#E2E8F0',
  borderLight: '#CBD5E1',

  // Brand Accents
  primary: '#059669',
  primaryDark: '#047857',
  secondary: '#2563EB',
  accent: '#7C3AED',
  warning: '#D97706',
  danger: '#DC2626',

  // Typography
  text: '#0F172A',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Interactive
  buttonDisabled: '#E2E8F0',
  buttonDisabledText: '#94A3B8',
};

export type ThemeColors = typeof darkColors;
