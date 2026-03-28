import { useMemo } from 'react';
import useTheme from './useTheme';

const useResonixTheme = () => {
  const { isDarkMode } = useTheme();

  const palette = useMemo(
    () => ({
      isDarkMode,
      background: isDarkMode ? '#050507' : '#F5F6FA',
      surface: isDarkMode ? '#111318' : '#FFFFFF',
      surfaceMuted: isDarkMode ? '#171A20' : '#F0F2F7',
      surfaceStrong: isDarkMode ? '#0D1015' : '#FBFCFE',
      border: isDarkMode ? '#1F2430' : '#E3E7EF',
      divider: isDarkMode ? '#1A1E26' : '#E7EAF1',
      text: isDarkMode ? '#F9FAFC' : '#11131A',
      subtext: isDarkMode ? '#9FA6B5' : '#657085',
      accent: '#E82255',
      accentSoft: isDarkMode ? 'rgba(232,34,85,0.18)' : '#FFE6ED',
      accentAlt: '#6D5EF7',
      success: '#35C48C',
      warning: '#FF9E44',
      shadow: '#000000',
    }),
    [isDarkMode],
  );

  return palette;
};

export default useResonixTheme;
