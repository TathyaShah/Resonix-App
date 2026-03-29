import { useContext } from 'react';
import { AppContext } from '../../App';

const useTheme = () => {
  const context = useContext(AppContext);
  const isDarkMode = context ? context.isDarkMode : false;
  const appTheme = context ? context.appTheme : 'system';
  const effectiveTheme = context ? context.effectiveTheme : 'light';
  const colorTheme = context ? context.colorTheme : 'red';
  const useDefaultColorTheme = context ? context.useDefaultColorTheme : true;
  return { isDarkMode, appTheme, effectiveTheme, colorTheme, useDefaultColorTheme };
};

export default useTheme;
