'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Monitor, Moon, Sun, Check } from 'lucide-react';
import { useTheme } from './theme-provider';
import type { ThemePreference } from '@/lib/theme';
const options = [
  { value: 'light', label: 'Light', detail: 'A bright, clear workspace', icon: Sun },
  { value: 'dark', label: 'Dark', detail: 'A calm, low-glare workspace', icon: Moon },
  { value: 'system', label: 'Follow device', detail: 'Match your device appearance', icon: Monitor },
] as const;
export function ThemeSwitcher() {
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);
  const id = useId(); const container = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); };
  }, [open]);
  function reveal() { setOpen(!open); }
  return <div className="theme-switcher" ref={container} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button type="button" ref={trigger} className="theme-toggle" aria-label="Appearance settings" title="Change light or dark appearance" aria-expanded={open} aria-controls={`${id}-panel`} onClick={reveal}>
      <Sun className="theme-icon-light" size={20} aria-hidden="true"/><Moon className="theme-icon-dark" size={20} aria-hidden="true"/>
    </button>
    {open && <div id={`${id}-panel`} className="theme-popover">
      <span className="theme-popover-heading">Make yourself comfortable.</span>
      <p>Your choice is saved on this browser.</p>
      <fieldset className="theme-options"><legend className="sr-only">Color theme</legend>
        {options.map(option => <label className="theme-option" key={option.value}>
          <input type="radio" name={`${id}-theme`} value={option.value} checked={preference === option.value} onChange={() => setPreference(option.value as ThemePreference)}/>
          <option.icon size={21} aria-hidden="true"/><span><strong>{option.label}</strong><small>{option.detail}</small></span><Check className="theme-option-check" size={18} aria-hidden="true"/>
        </label>)}
      </fieldset>
    </div>}
  </div>;
}
