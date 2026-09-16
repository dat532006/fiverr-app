import { createContext } from 'react';

export type Theme = 'light' | 'dark';

export type ThemeContextValue = Readonly<{
  theme: Theme;
  toggleTheme: () => void;
}>;

export const ThemeContext = createContext<ThemeContextValue | null>(null);
