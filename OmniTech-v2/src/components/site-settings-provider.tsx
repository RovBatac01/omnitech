'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { SiteSettings } from '@/types/cms';
const SiteSettingsContext = createContext<SiteSettings | null>(null);
export function SiteSettingsProvider({ settings, children }: { settings: SiteSettings; children: ReactNode }) {
  return <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>;
}
export function useSiteSettings() {
  const settings = useContext(SiteSettingsContext);
  if (!settings) throw new Error('SiteSettingsProvider is required.');
  return settings;
}
