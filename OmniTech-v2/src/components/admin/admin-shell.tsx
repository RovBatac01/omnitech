'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, ArrowUpRight, Bell, BriefcaseBusiness, ChevronRight, CircleHelp, LayoutDashboard, LogOut, Menu, MessageSquare, Settings2, ShieldCheck, Sparkles, X } from 'lucide-react';
import type { AdminSession } from '@/types/cms';
import { adminRequest, errorMessage } from './api';
import { ThemeSwitcher } from '../theme-switcher';
import { BrandLogo } from '../brand-logo';
import { useSiteSettings } from '../site-settings-provider';
const SessionContext = createContext<AdminSession | null>(null);
export function useAdmin() { const session = useContext(SessionContext); if (!session) throw new Error('An admin session is required.'); return session; }
const navigation = [
  { href: '/admin', title: 'Overview', icon: LayoutDashboard },
  { href: '/admin/inquiries', title: 'Quotation inbox', icon: MessageSquare },
  { href: '/admin/services', title: 'Solutions & services', icon: Sparkles },
  { href: '/admin/projects', title: 'Project portfolio', icon: BriefcaseBusiness },
  { href: '/admin/announcements', title: 'Announcements', icon: Bell },
  { href: '/admin/settings', title: 'Website settings', icon: Settings2 },
  { href: '/admin/account', title: 'Accounts & security', icon: ShieldCheck },
];
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname(); const router = useRouter(); const settings = useSiteSettings();
  const login = path === '/admin/login';
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [mobile, setMobile] = useState(false); const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => { setMobile(false); }, [path]);
  useEffect(() => {
    if (login) { setLoading(false); setSession(null); return; }
    let active = true; setLoading(true); setError('');
    adminRequest<AdminSession>('/api/admin/session').then(data => { if (active) setSession(data); }).catch(err => { if (active) setError(errorMessage(err)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [login]);
  useEffect(() => { function escape(e: KeyboardEvent) { if (e.key === 'Escape') { setMobile(false); document.getElementById('admin-nav-toggle')?.focus(); } } if (mobile) document.addEventListener('keydown', escape); return () => document.removeEventListener('keydown', escape); }, [mobile]);
  async function logout() { if (!session) return; setLoggingOut(true); try { await adminRequest('/api/admin/logout', { method: 'POST' }, session.csrfToken); setSession(null); router.replace('/admin/login'); } catch (err) { setError(errorMessage(err)); } finally { setLoggingOut(false); } }
  if (login) return <div className="admin-root">{children}</div>;
  if (loading) return <div className="admin-root"><main id="main" className="admin-loading" aria-busy="true"><span className="admin-spinner"/><h1>Opening your workspace</h1><p>Checking your secure session…</p></main></div>;
  if (!session) return <div className="admin-root"><main id="main" className="admin-loading"><ShieldCheck size={40}/><h1>Sign in to continue</h1>{error && <p role="alert">{error}</p>}<Link href="/admin/login" className="admin-button">Go to admin sign in</Link></main></div>;
  const current = navigation.find(n => n.href === path)?.title || 'Workspace';
  return <SessionContext.Provider value={session}><div className={`admin-root admin-workspace ${mobile ? 'admin-menu-open' : ''}`}>
    <aside className="admin-sidebar" aria-label="Administration">
      <Link className="admin-wordmark admin-business-brand" href="/admin" aria-label={`${settings.businessName} admin workspace`}><BrandLogo settings={settings} priority/></Link>
      <div className="admin-workspace-label"><span className="admin-live-dot"/> YOUR BUSINESS, CONNECTED</div>
      <nav id="admin-navigation" aria-label="Admin navigation">{navigation.map(item => <Link key={item.href} href={item.href} className={path === item.href ? 'is-active' : ''} aria-current={path === item.href ? 'page' : undefined}><item.icon size={19}/><span>{item.title}</span>{path === item.href && <ChevronRight size={16}/>}</Link>)}</nav>
      <div className="admin-sidebar-bottom"><div className="admin-tip"><CircleHelp size={19}/><p>Keep your website current.<br/><span>Save as a draft, then publish when ready.</span></p></div><Link href="/" target="_blank" rel="noreferrer" className="admin-site-link">View public website <ArrowUpRight size={17}/><span className="sr-only"> (opens in a new tab)</span></Link></div>
    </aside>
    <div className="admin-main-shell">
      <header className="admin-topbar"><div><button id="admin-nav-toggle" className="admin-icon-button admin-menu-toggle" aria-label={mobile ? 'Close admin navigation' : 'Open admin navigation'} aria-expanded={mobile} aria-controls="admin-navigation" onClick={() => setMobile(!mobile)}>{mobile ? <X size={22}/> : <Menu size={22}/>}</button><span className="admin-breadcrumb"><span className="admin-breadcrumb-root">Workspace</span> <ChevronRight size={14}/><strong>{current}</strong></span></div><div className="admin-session"><ThemeSwitcher/><span className="admin-avatar" aria-hidden="true">{session.user.name.slice(0, 1).toUpperCase()}</span><span className="admin-session-name">{session.user.name}<small>{session.user.role === 'owner' ? 'Owner administrator' : 'Administrator'}</small></span><button className="admin-icon-button" onClick={logout} disabled={loggingOut} aria-label="Sign out"><LogOut size={19}/></button></div></header>
      {error && <div className="admin-banner admin-banner-error" role="alert">{error}</div>}
      {children}
      <footer className="admin-workspace-footer"><span>{settings.businessName} · Website management</span><span><ShieldCheck size={14}/> Private admin workspace</span></footer>
    </div>
  </div></SessionContext.Provider>;
}
