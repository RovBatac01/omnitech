/** Shared, browser-safe appearance utilities. No database or React dependencies. */
import type { SiteSettings } from '@/types/cms';
export type ThemePreference = 'light' | 'dark' | 'system';
export type ColorTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'omnitech-appearance';
export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}
export function resolveTheme(preference: ThemePreference, deviceIsDark: boolean): ColorTheme {
  return preference === 'system' ? (deviceIsDark ? 'dark' : 'light') : preference;
}
export function themeLogos(settings: Pick<SiteSettings, 'logoUrl' | 'logoAlt' | 'logoLightUrl' | 'logoLightAlt' | 'logoDarkUrl' | 'logoDarkAlt' | 'businessName'>) {
  const legacy = { url: settings.logoUrl || '', alt: settings.logoAlt || settings.businessName };
  const light = { url: settings.logoLightUrl || '', alt: settings.logoLightAlt || settings.businessName };
  const dark = { url: settings.logoDarkUrl || '', alt: settings.logoDarkAlt || settings.businessName };
  // Existing installations retain their logo; a single new logo also works in both themes.
  return {
    light: light.url ? light : legacy.url ? legacy : dark,
    dark: dark.url ? dark : legacy.url ? legacy : light,
  };
}
/** Runs in the document head, before content is painted. Only enum values enter the script. */
export function themeInitScript(preference: ThemePreference): string {
  const safeDefault = isThemePreference(preference) ? preference : 'system';
  return `(function(){var p=${JSON.stringify(safeDefault)};try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(s==='light'||s==='dark'||s==='system')p=s;}catch(e){}var d=p==='dark'||(p==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.dataset.themePreference=p;})();`;
}
