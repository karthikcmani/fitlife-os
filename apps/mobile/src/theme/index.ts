import { darkColors, lightColors, ThemeColors } from './colors';
import { spacing, borderRadius } from './spacing';
import { typography } from './typography';

export { darkColors, lightColors, spacing, borderRadius, typography };
export type { ThemeColors };

// Default theme is OLED dark
export const theme = {
  colors: darkColors,
  spacing,
  borderRadius,
  typography,
};
