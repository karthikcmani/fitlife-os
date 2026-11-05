import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Appearance } from 'react-native';
import { darkColors, lightColors, ThemeColors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

export type ThemeAppearance = 'system' | 'light' | 'dark';
export type ThemeColor = 'emerald' | 'ocean' | 'violet' | 'neutral';

const THEME_APPEARANCE_KEY = 'fitlife_theme_appearance';
const THEME_COLOR_KEY = 'fitlife_theme_color';

interface PaletteAccents {
  dark: { primary: string; primaryDark: string };
  light: { primary: string; primaryDark: string };
}

const PALETTES: Record<ThemeColor, PaletteAccents> = {
  emerald: {
    dark: { primary: '#00E699', primaryDark: '#059669' },
    light: { primary: '#059669', primaryDark: '#047857' },
  },
  ocean: {
    dark: { primary: '#38BDF8', primaryDark: '#0284C7' },
    light: { primary: '#0284C7', primaryDark: '#0369A1' },
  },
  violet: {
    dark: { primary: '#A78BFA', primaryDark: '#7C3AED' },
    light: { primary: '#7C3AED', primaryDark: '#6D28D9' },
  },
  neutral: {
    dark: { primary: '#E4E4E7', primaryDark: '#A1A1AA' },
    light: { primary: '#27272A', primaryDark: '#18181B' },
  },
};

export function buildThemeColors(appearance: ThemeAppearance, color: ThemeColor): { colors: ThemeColors; isDark: boolean } {
  const systemScheme = Appearance.getColorScheme();
  const isDark = appearance === 'system' ? systemScheme !== 'light' : appearance === 'dark';
  const base = isDark ? { ...darkColors } : { ...lightColors };
  const palette = PALETTES[color] || PALETTES.emerald;
  const accents = isDark ? palette.dark : palette.light;

  return {
    isDark,
    colors: {
      ...base,
      primary: accents.primary,
      primaryDark: accents.primaryDark,
    },
  };
}

interface ThemeState {
  appearance: ThemeAppearance;
  themeColor: ThemeColor;
  isDark: boolean;
  colors: ThemeColors;
  isReady: boolean;
  initialize: () => Promise<void>;
  setAppearance: (appearance: ThemeAppearance) => Promise<void>;
  setThemeColor: (color: ThemeColor) => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  appearance: 'dark',
  themeColor: 'emerald',
  isDark: true,
  colors: buildThemeColors('dark', 'emerald').colors,
  isReady: false,

  initialize: async () => {
    try {
      const savedApp = (await SecureStore.getItemAsync(THEME_APPEARANCE_KEY)) as ThemeAppearance | null;
      const savedCol = (await SecureStore.getItemAsync(THEME_COLOR_KEY)) as ThemeColor | null;

      const appearance: ThemeAppearance = savedApp || 'dark';
      const themeColor: ThemeColor = savedCol || 'emerald';
      const { colors, isDark } = buildThemeColors(appearance, themeColor);

      set({
        appearance,
        themeColor,
        isDark,
        colors,
        isReady: true,
      });
    } catch {
      set({ isReady: true });
    }
  },

  setAppearance: async (appearance: ThemeAppearance) => {
    const { themeColor } = get();
    const { colors, isDark } = buildThemeColors(appearance, themeColor);
    try {
      await SecureStore.setItemAsync(THEME_APPEARANCE_KEY, appearance);
    } catch {
      // Ignore secure storage failure
    }
    set({ appearance, colors, isDark });
  },

  setThemeColor: async (themeColor: ThemeColor) => {
    const { appearance } = get();
    const { colors, isDark } = buildThemeColors(appearance, themeColor);
    try {
      await SecureStore.setItemAsync(THEME_COLOR_KEY, themeColor);
    } catch {
      // Ignore secure storage failure
    }
    set({ themeColor, colors, isDark });
  },
}));

export function useTheme() {
  const { colors, isDark, appearance, themeColor, setAppearance, setThemeColor } = useThemeStore();
  return {
    colors,
    isDark,
    appearance,
    themeColor,
    setAppearance,
    setThemeColor,
    spacing,
    borderRadius,
    typography,
  };
}
