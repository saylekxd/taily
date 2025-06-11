import { FontSize, ColorTheme } from '@/types';
import { colors } from '@/constants/colors';
import { ColorThemeStyle } from './types';

export const fontSizes: Record<FontSize, number> = {
  small: 16,
  medium: 20,
  large: 24,
  xlarge: 28,
  xxlarge: 32,
};

export const lineHeights: Record<FontSize, number> = {
  small: 24,
  medium: 30,
  large: 36,
  xlarge: 42,
  xxlarge: 48,
};

export const colorThemes: Record<ColorTheme, ColorThemeStyle> = {
  dark: {
    background: colors.background,
    text: colors.white,
    card: colors.card,
  },
  light: {
    background: '#FFFFFF',
    text: '#000000',
    card: '#F5F5F5',
  },
  sepia: {
    background: '#F4F1E8',
    text: '#5D4037',
    card: '#EFEBE0',
  },
  'high-contrast': {
    background: '#000000',
    text: '#FFFFFF',
    card: '#333333',
  },
}; 