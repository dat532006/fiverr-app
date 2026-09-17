import { useContext } from 'react';
import { ThemeContext } from './theme-context';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme phải được dùng bên trong ThemeProvider.');
  }
  return context;
}
