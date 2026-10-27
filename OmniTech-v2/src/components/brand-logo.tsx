import type { SiteSettings } from '@/types/cms';
import { themeLogos } from '@/lib/theme';
type BrandLogoProps = { settings: SiteSettings; variant?: 'full' | 'symbol'; placement?: 'header' | 'hub' | 'footer'; priority?: boolean };
export function BrandLogo({ settings, variant = 'full', placement = 'header', priority = false }: BrandLogoProps) {
  const fullName = settings.businessName;
  const isDefault = /^OMNITECH\s+IT SOLUTIONS AND DIGITAL SERVICES$/i.test(fullName.trim());
  const logos = themeLogos(settings);
  const hasLogo = !!(logos.light.url || logos.dark.url);
  const size = placement === 'hub' ? 100 : 52;
  return <span className={`business-brand business-brand-${placement} ${hasLogo ? 'has-logo' : ''}`}>
    {(['light', 'dark'] as const).map(theme => logos[theme].url && <img key={theme} className={`theme-logo theme-logo-${theme}`} src={logos[theme].url} alt={logos[theme].alt} width={size} height={size} loading={priority ? 'eager' : 'lazy'}/>)}
    {variant === 'symbol' ? <span className="hub-wordmark" aria-label={fullName}>{isDefault ? <>OMNI<span>TECH</span></> : fullName.split(' ').slice(0, 2).join(' ')}</span> : <span className="business-wordmark">{isDefault ? <><strong>OMNITECH<span className="wordmark-period">.</span></strong><span>IT SOLUTIONS AND<br />DIGITAL SERVICES</span></> : <strong className="custom-business-name">{fullName}</strong>}</span>}
  </span>;
}
