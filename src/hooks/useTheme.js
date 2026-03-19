import { useContext } from 'react';
import { AppContext } from '../../App';

const useTheme = () => {
  const context = useContext(AppContext);
  const isDarkMode = context ? context.isDarkMode : false;
  const appTheme = context ? context.appTheme : 'system';
  const effectiveTheme = context ? context.effectiveTheme : 'light';
  return { isDarkMode, appTheme, effectiveTheme };
};

export default useTheme;
