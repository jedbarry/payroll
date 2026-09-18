import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ThemeTokens, darkTheme, lightTheme } from './tokens';

interface ThemeContextValue {
  theme: ThemeTokens;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme';

async function getStoredTheme(): Promise<'dark' | 'light' | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(THEME_STORAGE_KEY) as 'dark' | 'light' | null;
      }
      return null;
    }
    const val = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
    return val as 'dark' | 'light' | null;
  } catch {
    return null;
  }
}

async function setStoredTheme(theme: 'dark' | 'light'): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
      return;
    }
    await SecureStore.setItemAsync(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    getStoredTheme().then((stored) => {
      if (!mounted) return;
      if (stored === 'light') {
        setIsDark(false);
      } else if (stored === 'dark') {
        setIsDark(true);
      } else {
        setIsDark(true); // default to dark
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      setStoredTheme(next ? 'dark' : 'light');
      return next;
    });
  };

  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      toggleTheme,
    }),
    [theme, isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
