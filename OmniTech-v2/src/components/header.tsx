'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from './brand-logo';
import { Icon } from './icon';
import { ThemeSwitcher } from './theme-switcher';
import type { CmsService, SiteSettings } from '@/types/cms';
export function Header({ settings, services }: { settings: SiteSettings; services: CmsService[] }) {
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const path = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const solutionsToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => { setOpen(false); setDropdown(false); }, [path]);
  useEffect(() => {
    function close(e: KeyboardEvent) { if (e.key === 'Escape' && (open || dropdown)) { if (dropdown) { setDropdown(false); solutionsToggle.current?.focus(); } else { setOpen(false); toggle.current?.focus(); } } }
    function outside(e: PointerEvent) { if (!panel.current?.contains(e.target as Node)) { setDropdown(false); setOpen(false); } }
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); };
  }, [open, dropdown]);
  const navigate = () => { setOpen(false); setDropdown(false); };
  return <header className="site-header"><div className="nav-shell" ref={panel}>
    <Link className="brand-link" href="/" aria-label={`${settings.businessName} home`} onClick={navigate}><BrandLogo settings={settings} priority /></Link>
    <div className="header-appearance"><ThemeSwitcher/></div>
    <button ref={toggle} className="mobile-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}><Icon name={open ? 'x' : 'menu'} /></button>
    <nav id="main-navigation" className={open ? 'navigation is-open' : 'navigation'} aria-label="Main navigation">
      <Link href="/" aria-current={path === '/' ? 'page' : undefined} className={path === '/' ? 'active' : ''} onClick={navigate}>Home</Link>
      <div className="nav-dropdown" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDropdown(false); }}>
        <button ref={solutionsToggle} aria-expanded={dropdown} aria-controls="solutions-menu" className={path.startsWith('/services') ? 'active' : ''} onClick={() => setDropdown(!dropdown)} onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setDropdown(true); setTimeout(() => document.querySelector<HTMLAnchorElement>('#solutions-menu a')?.focus(), 0); } }}>Solutions <Icon name="chevron" size={16} /></button>
        {dropdown && <div className="dropdown-panel" id="solutions-menu" onKeyDown={e => { if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; const items = Array.from(e.currentTarget.querySelectorAll<HTMLAnchorElement>('a')); const active = items.indexOf(document.activeElement as HTMLAnchorElement); e.preventDefault(); items[(active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus(); }}><Link className="dropdown-overview" href="/services" onClick={navigate}><Icon name="layers" size={19}/><span>Explore all solutions</span><Icon name="arrow" size={16}/></Link>{services.map(s => <Link key={s.id} href={`/services/${s.slug}`} onClick={navigate}><Icon name={s.icon} size={19}/><span>{s.title}</span></Link>)}</div>}
      </div>
      <Link href="/#about" onClick={navigate}>About us</Link>
      <Link href="/projects" aria-current={path.startsWith('/projects') ? 'page' : undefined} onClick={navigate}>Projects</Link>
      <Link href="/announcements" aria-current={path.startsWith('/announcements') ? 'page' : undefined} onClick={navigate}>Updates</Link>
      <Link href="/resources" aria-current={path.startsWith('/resources') ? 'page' : undefined} onClick={navigate}>Resources</Link>
      <Link href="/contact" className="mobile-contact-link" aria-current={path === '/contact' ? 'page' : undefined} onClick={navigate}>Contact</Link>
    </nav>
    <Link href="/contact" className="button button-small nav-cta" data-track="header-quote">Let’s talk <Icon name="diagonal" size={18}/></Link>
  </div></header>;
}
