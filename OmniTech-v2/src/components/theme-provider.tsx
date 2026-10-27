'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { isThemePreference, resolveTheme, THEME_STORAGE_KEY, type ColorTheme, type ThemePreference } from '@/lib/theme';

type ThemeContextValue = { preference: ThemePreference; theme: ColorTheme; setPreference: (value: ThemePreference) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('ThemeProvider is required.');
  return context;
}
export function ThemeProvider({ children, defaultTheme = 'system' }: { children: ReactNode; defaultTheme?: ThemePreference }) {
  const [preference, setValue] = useState<ThemePreference>(defaultTheme);
  const [theme, setTheme] = useState<ColorTheme>(defaultTheme === 'light' ? 'light' : 'dark');
  const currentPreference = useRef<ThemePreference>(defaultTheme);
  // Keep a choice in memory even when a browser refuses persistent storage.
  const volatileChoice = useRef<ThemePreference | null>(null);
  const apply = useCallback((value: ThemePreference) => {
    const resolved = resolveTheme(value, window.matchMedia('(prefers-color-scheme: dark)').matches);
    currentPreference.current = value;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = value;
    setValue(value); setTheme(resolved);
  }, []);
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(THEME_STORAGE_KEY); } catch { /* Private/restricted storage: use the in-memory choice. */ }
    apply(isThemePreference(saved) ? saved : volatileChoice.current || defaultTheme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function deviceChanged() { if (currentPreference.current === 'system') apply('system'); }
    function storageChanged(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      volatileChoice.current = null;
      apply(isThemePreference(event.newValue) ? event.newValue : defaultTheme);
    }
    media.addEventListener('change', deviceChanged);
    window.addEventListener('storage', storageChanged);
    document.documentElement.classList.add('theme-ready');
    return () => { media.removeEventListener('change', deviceChanged); window.removeEventListener('storage', storageChanged); };
  }, [defaultTheme, apply]);
  const setPreference = useCallback((value: ThemePreference) => {
    if (!isThemePreference(value)) return;
    volatileChoice.current = value;
    try { window.localStorage.setItem(THEME_STORAGE_KEY, value); } catch { /* The switch still works without persistent storage. */ }
    apply(value);
  }, [apply]);
  return <ThemeContext.Provider value={{ preference, theme, setPreference }}>{children}</ThemeContext.Provider>;
}
