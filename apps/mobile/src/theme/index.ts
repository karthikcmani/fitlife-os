import { darkColors, lightColors, ThemeColors } from './colors';
import { spacing, borderRadius } from './spacing';
import { typography } from './typography';
import { useThemeStore, useTheme, buildThemeColors, ThemeAppearance, ThemeColor } from '../store/themeStore';

export {
  darkColors,
  lightColors,
  spacing,
  borderRadius,
  typography,
  useThemeStore,
  useTheme,
  buildThemeColors,
};
export type { ThemeColors, ThemeAppearance, ThemeColor };

// Default theme is OLED dark
export const theme = {
  colors: darkColors,
  spacing,
  borderRadius,
  typography,
};
