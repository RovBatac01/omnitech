# OmniTech appearance system — 2.1.0

## User controls and precedence

The header appearance button contains native radio controls for Light, Dark, and Follow device. The same control is used by the login page and admin toolbar. A local browser choice takes priority over the published default. Follow device observes `prefers-color-scheme`, including changes while the page is open. Cross-tab storage events synchronize preference changes between open tabs of the same origin.

The browser key `omnitech-appearance` stores only `light`, `dark`, or `system`. Invalid values are ignored. Storage exceptions do not prevent switching; a volatile choice works until the current app session ends. This is a browser preference, not an administrator-account preference. Clearing site data resets it. The privacy notice discloses the setting.

A synchronous, allowlisted initialization script in the root document head sets `data-theme` before the content is painted. The provider keeps the document synchronized after hydration and when the admin default is refreshed. A strict deployment CSP must authorize this inline boot script as well as Next.js scripts; configure a nonce/hash strategy before enforcing a stricter CSP. Do not simply remove the initialization script.

## Settings schema

The existing settings JSON gains:

| Field | Meaning |
| --- | --- |
| `logoLightUrl` | Registered local upload displayed for light appearance |
| `logoLightAlt` | Meaningful text alternative for that image |
| `logoDarkUrl` | Registered local upload displayed for dark appearance |
| `logoDarkAlt` | Meaningful text alternative for that image |
| `defaultTheme` | `light`, `dark`, or `system`; default `system` |

`logoUrl` and `logoAlt` remain supported for compatibility. Read-time defaults fill absent keys without resetting other content. Validation requires alt text for each populated dedicated logo and accepts only the three appearance values. Existing CSRF, role checks, upload registration, size limits, and raster-image handling remain in effect.

`themeLogos()` picks each variant independently: dedicated image → legacy image → other variant → business wordmark. Both selected image elements are rendered, and CSS exposes only the active one (`display:none` on the inactive image). CSS does not invent, invert, or recolor logos. Transparent source pixels reveal the surrounding site surface. Large transparent margins embedded in an image still affect its apparent size.

## UI and styling

`src/app/themes.css` supplies a white/soft-mint light palette, teal primary actions, dark slate text, mode controls, and the two-logo editor. Existing dark component colors remain as semantic-token fallbacks. Native system font stacks are used; no font binaries or third-party font requests are required. The design remains responsive, with enlarged-text reflow corrections.

Use semantic `--ui-*` and `--appearance-*` tokens when adding components. Do not add an unconditional white background to `.theme-logo`. Preview cards intentionally stay white or deep teal regardless of the surrounding admin theme. New logo upload state disables saving until both uploads settle.

Controls have a visible focus state, 44px appearance trigger, native keyboard radio behavior, Escape-to-close and focus return, reduced-motion support, and forced-colors overrides. Text and images must still be reviewed against their actual backgrounds. This update is not a WCAG certification.

## Tests and release acceptance

```powershell
npm run typecheck
npm run test:themes
npm run build
npx playwright install chromium
npm run test:e2e:themes
```

The new browser suite covers preference persistence, device changes, keyboard behavior, denied storage, transparent image uploads, independent settings, and public reflow/accessibility scans. Its configuration uses a separate `qa/e2e` SQLite database and clears SMTP credentials; it does not use the production database. Review `docs/VERIFICATION-2.1.md` for which checks were actually executed during preparation.

Manually verify both logos on your actual pages, screen-reader names, 200% zoom, hover/focus/pressed states, the mobile menu alongside the appearance popup, content that contains long words, and your real business logo proportions. Retest future content and externally hosted media separately.
