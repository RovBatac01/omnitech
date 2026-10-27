'use client';
import { Moon, Sun, Monitor, ArrowRight } from 'lucide-react';
import type { SiteSettings } from '@/types/cms';
import { themeLogos } from '@/lib/theme';
import { useTheme } from '../theme-provider';
import { MediaUpload, Panel, SelectField, TextField } from './ui';
type Props = {
  settings: SiteSettings;
  set: <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => void;
  errors: Record<string, string>;
  onUploadState: (theme: 'light' | 'dark', pending: boolean) => void;
};
export function AppearanceSettings({ settings: v, set, errors, onUploadState }: Props) {
  const { setPreference } = useTheme();
  const previews = themeLogos(v);
  return <section id="appearance-settings"><Panel title="One brand. Two appearances." description="Give every visitor a comfortable experience, with a logo designed for each background.">
    <div className="admin-appearance-intro"><div><span className="admin-appearance-kicker"><Monitor size={16} aria-hidden="true"/> WEBSITE APPEARANCE</span><h3>Let your brand shine, day or night.</h3><p>Visitors can switch appearance from the header. Their saved preference takes priority over the default below.</p></div><SelectField label="Default website appearance" value={v.defaultTheme} onChange={value => set('defaultTheme', value as SiteSettings['defaultTheme'])} options={[{ value: 'system', label: 'Follow device (recommended)' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} hint="Applies to visitors who have not saved a theme preference."/></div>
    {errors.defaultTheme && <p className="admin-field-error" role="alert">{errors.defaultTheme}</p>}
    <div className="admin-logo-grid">
      {(['light', 'dark'] as const).map(theme => {
        const light = theme === 'light'; const title = light ? 'Light mode' : 'Dark mode'; const ModeIcon = light ? Sun : Moon;
        const urlKey = light ? 'logoLightUrl' : 'logoDarkUrl'; const altKey = light ? 'logoLightAlt' : 'logoDarkAlt';
        return <div className="admin-logo-card" key={theme}>
          <div className="admin-logo-preview" data-preview-theme={theme}><span className="admin-logo-preview-label"><ModeIcon size={16} aria-hidden="true"/>{title} preview</span><div className="admin-logo-preview-stage">{previews[theme].url ? <img src={previews[theme].url} alt={previews[theme].alt}/> : <span className="admin-logo-placeholder">{v.businessName}</span>}</div><small>{light ? 'White / soft mint background' : 'Midnight / deep teal background'}</small></div>
          <div className="admin-logo-card-body"><h3><ModeIcon size={20} aria-hidden="true"/>{title} logo</h3><p className="admin-logo-guidance">{light ? 'Upload a dark or full-color logo that stands out on a light background.' : 'Upload a white or light-colored logo that stands out on a dark background.'}</p>
            <MediaUpload label={`${title} logo file`} value={v[urlKey]} onChange={url => { set(urlKey, url); if (url && !v[altKey]) set(altKey, v.businessName); }} previewTone={theme} onPendingChange={pending => onUploadState(theme, pending)}/>
            <TextField label={`${title} logo alternative text`} value={v[altKey]} onChange={alt => set(altKey, alt)} maxLength={300} required={!!v[urlKey]} error={errors[altKey]} hint="Usually your business name. Describe meaningful text in the logo."/>
            {errors[urlKey] && <p className="admin-field-error" role="alert">{errors[urlKey]}</p>}
            <button className="admin-button admin-button-secondary" type="button" onClick={() => setPreference(theme)}>Preview {title.toLowerCase()}<ArrowRight size={16} aria-hidden="true"/></button>
          </div>
        </div>;
      })}
    </div>
    <p className="admin-small-note">Transparent areas stay transparent. Images are never inverted or recolored. The preview shows your selected image; save settings to update the header, footer, homepage hub, and admin branding. When a theme logo is missing, the existing shared logo is used, then the other theme’s logo, then the business name.</p>
    {v.logoUrl && <details className="admin-legacy-logo"><summary>Existing shared logo (fallback)</summary><p className="admin-small-note">Your previously uploaded logo is kept for any theme without its own logo. Removing this reference does not delete the uploaded file.</p><MediaUpload label="Shared fallback logo" value={v.logoUrl} onChange={url => set('logoUrl', url)}/><TextField label="Shared logo alternative text" value={v.logoAlt} onChange={alt => set('logoAlt', alt)} required={!!v.logoUrl} maxLength={300} error={errors.logoAlt}/></details>}
  </Panel></section>;
}
