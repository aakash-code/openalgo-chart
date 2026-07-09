/**
 * Theme Context
 * Provides theme state and toggle functionality
 */

import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  type ReactNode,
} from 'react';
import { getString, set, STORAGE_KEYS } from '../services/storageService';

/** Theme type */
export type Theme = 'light' | 'dark';

/** Theme context value */
export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Get theme type from string
 */
function getThemeType(theme: string): Theme {
  return theme === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return getThemeType(getString(STORAGE_KEYS.THEME, 'dark'));
  });

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  // Re-sync theme from localStorage
  const refreshFromStorage = useCallback(() => {
    const storedTheme = getString(STORAGE_KEYS.THEME, 'dark');
    if (storedTheme && getThemeType(storedTheme) !== theme) {
      setThemeState(getThemeType(storedTheme));
    }
  }, [theme]);

  // Listen for cloud sync completion
  useEffect(() => {
    const handleCloudSyncComplete = () => {
      refreshFromStorage();
    };

    window.addEventListener('cloud-sync-complete', handleCloudSyncComplete);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tv_theme' && e.newValue) {
        setThemeState(getThemeType(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('cloud-sync-complete', handleCloudSyncComplete);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [refreshFromStorage]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    set(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
