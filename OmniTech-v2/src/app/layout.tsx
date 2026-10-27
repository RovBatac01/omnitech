import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteSettingsProvider } from '@/components/site-settings-provider';
import { themeInitScript } from '@/lib/theme';
import { getPublicSettings,getServices } from '@/lib/cms';
import { PublicShell } from '@/components/public-shell';
import './globals.css';
import './service-enhancements.css';
import './contact-enhancements.css';
import './themes.css';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export function generateMetadata():Metadata {
  const settings=getPublicSettings();
  const title=settings.businessName;
  return {metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||process.env.APP_ORIGIN||'http://localhost:3000'),title:{default:`${title} | Connected thinking. Practical solutions.`,template:`%s | ${title}`},description:settings.heroDescription,openGraph:{title,description:settings.heroDescription,type:'website'},twitter:{card:'summary_large_image',title,description:settings.heroDescription},robots:{index:true,follow:true}};
}
export default function RootLayout({children}:{children:React.ReactNode}) {
  const settings=getPublicSettings();const services=getServices();
  return <html lang="en" data-theme={settings.defaultTheme === 'light' ? 'light' : 'dark'} suppressHydrationWarning><head><script id="omnitech-theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript(settings.defaultTheme) }}/></head><body id="top"><a className="skip-link" href="#main">Skip to content</a><ThemeProvider defaultTheme={settings.defaultTheme}><SiteSettingsProvider settings={settings}><PublicShell settings={settings} services={services}>{children}</PublicShell></SiteSettingsProvider></ThemeProvider></body></html>;
}
