import { useMemo } from 'react';
import useTheme from './useTheme';

const COLOR_THEMES = {
  default: {
    primary: '#E82255',
    primarySoftLight: '#FFE6ED',
    primarySoftDark: 'rgba(232,34,85,0.18)',
    secondary: '#FF5E85',
    tertiary: '#F39AB0',
    gradientLight: ['#FFF3F7', '#FFFFFF'],
    gradientDark: ['#1A1020', '#090A0F'],
  },
  sunset: {
    primary: '#F57C00',
    primarySoftLight: '#FFF1DE',
    primarySoftDark: 'rgba(245,124,0,0.20)',
    secondary: '#FFB300',
    tertiary: '#FF7043',
    gradientLight: ['#FFF4DE', '#FFFFFF'],
    gradientDark: ['#2A1708', '#090A0F'],
  },
  green: {
    primary: '#2E7D32',
    primarySoftLight: '#E8F5E9',
    primarySoftDark: 'rgba(46,125,50,0.22)',
    secondary: '#43A047',
    tertiary: '#66BB6A',
    gradientLight: ['#ECF9EE', '#FFFFFF'],
    gradientDark: ['#102015', '#090A0F'],
  },
  red: {
    primary: '#E53935',
    primarySoftLight: '#FDECEC',
    primarySoftDark: 'rgba(229,57,53,0.20)',
    secondary: '#EF5350',
    tertiary: '#FF7043',
    gradientLight: ['#FFF0F1', '#FFFFFF'],
    gradientDark: ['#241012', '#090A0F'],
  },
  blue: {
    primary: '#1565C0',
    primarySoftLight: '#E8F0FE',
    primarySoftDark: 'rgba(21,101,192,0.22)',
    secondary: '#1E88E5',
    tertiary: '#42A5F5',
    gradientLight: ['#EDF5FF', '#FFFFFF'],
    gradientDark: ['#0F1726', '#090A0F'],
  },
};

const useResonixTheme = () => {
  const { isDarkMode, colorTheme, useDefaultColorTheme } = useTheme();

  const palette = useMemo(
    () => {
      const selectedTheme = useDefaultColorTheme
        ? COLOR_THEMES.default
        : (COLOR_THEMES[colorTheme] || COLOR_THEMES.red);

      return {
        isDarkMode,
        colorTheme,
        useDefaultColorTheme,
        background: isDarkMode ? '#050507' : '#F5F6FA',
        surface: isDarkMode ? '#111318' : '#FFFFFF',
        surfaceMuted: isDarkMode ? '#171A20' : '#F0F2F7',
        surfaceStrong: isDarkMode ? '#0D1015' : '#FBFCFE',
        card: isDarkMode ? '#111318' : '#FFFFFF',
        cardMuted: isDarkMode ? '#171A20' : '#F0F2F7',
        input: isDarkMode ? '#0D1015' : '#F8F9FC',
        border: isDarkMode ? '#1F2430' : '#E3E7EF',
        divider: isDarkMode ? '#1A1E26' : '#E7EAF1',
        text: isDarkMode ? '#F9FAFC' : '#11131A',
        subtext: isDarkMode ? '#9FA6B5' : '#657085',
        primary: selectedTheme.primary,
        secondary: selectedTheme.secondary,
        tertiary: selectedTheme.tertiary,
        accent: selectedTheme.primary,
        accentSoft: isDarkMode ? selectedTheme.primarySoftDark : selectedTheme.primarySoftLight,
        accentAlt: selectedTheme.secondary,
        success: selectedTheme.tertiary,
        warning: selectedTheme.secondary,
        heroGradient: isDarkMode ? selectedTheme.gradientDark : selectedTheme.gradientLight,
        shadow: '#000000',
      };
    },
    [colorTheme, isDarkMode, useDefaultColorTheme],
  );

  return palette;
};

export default useResonixTheme;
