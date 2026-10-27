> Historical record supplied with the uploaded 2.0.0 project. It has not been rerun for 2.1.0. See [VERIFICATION-2.1.md](VERIFICATION-2.1.md) for current evidence and limitations.

# Verification record — OmniTech 2.0.0

Date: October 24, 2026. Environment: Node.js 24.19.0 on Linux; production Next.js build; Chromium 153. This record describes observed checks, not independent accessibility certification or a guarantee against every security issue.

## Automated checks

- `npm run typecheck`: passed.
- `npm test`: 15 passed, 0 failed. Coverage includes password/session handling; CSRF and owner permissions; publication and scheduling; contact persistence without SMTP; duplicate submission prevention and payload conflicts; partial mail failures and independent recipient retry; concurrent delivery leases; private/formula-safe CSV; analytics privacy; raster and caption upload validation; malformed payloads; and dynamic contact-form service validation.
- `npm run build`: production compilation, typechecking, route generation and build tracing passed.
- `npm audit --omit=dev --json`: 0 reported production dependency vulnerabilities at the time checked. This is a point-in-time registry advisory check, not a code security audit.
- `npm run test:e2e`: **5 passed, 0 failed** on the final production build (22 seconds). These integrated scenarios are in `tests/e2e/platform.spec.ts`. No WCAG-tagged axe violations were reported in the final tested public and admin states.

## Browser workflow coverage

1. Public navigation and page rendering, one primary heading, narrow-screen reflow at 390/320 CSS pixels, 200% text enlargement, keyboard skip link, and automated WCAG scans.
2. Public quotation errors and correction, saved reference number, one persisted inquiry, admin status/notes, CSV export, duplicate retries, and rejection of a different payload reusing the same submission identifier.
3. Immediate public rendering of a newly published service; quotation service selection; image upload/serving; draft-to-published completed portfolio; project narrative; announcement scheduling; editable mission and recipients.
4. Unauthenticated admin access rejection, CSRF and cross-origin rejection, owner-only management, and executable/SVG upload rejection.
5. Private admin screens, responsive layouts, and automated accessibility scans.

Next.js can return HTTP 200 for a streamed not-found page after headers have already been sent. Draft/expired/future content checks verify that its content is absent and the page is noindex, rather than relying on HTTP status alone. See [Next.js not-found behavior](https://nextjs.org/docs/app/api-reference/file-conventions/not-found).

## Additional targeted checks

- Owner login and real UI authoring of a service, completed project with image/alt text/service categories/stack/narrative, and promotion; corresponding public detail pages verified.
- Website name, mission and extra notification recipient changes saved and restored on the isolated QA database.
- Keyboard navigation verified for public/mobile menus, solution dropdown arrows and Escape, industry tabs, project filters/search/reset, and queue demonstration tabs/call-next/reset.
- Eight distinct admin states scanned, including opened editors, settings/accounts, desktop/mobile dashboard, and mobile portfolio editor. Populated inquiry tables separately checked for keyboard access and narrow-screen/text resizing.
- Public visual checks at desktop, tablet and phone widths. Text resizing checks covered navigation, service grids, technology illustration, forms and tables.
- Production launcher successfully started both the website and mail worker and shut them down together.
- SQLite online backup exercised; a new SQLite connection to its snapshot confirmed the 13 seeded services.
- The actual Nodemailer SMTP transport was exercised against a TLS-validated SMTP server bound to 127.0.0.1, with authentication, Reply-To, expected recipient, captured message content and saved acceptance status verified. No email was sent to a real external recipient.

## Accessibility scope and remaining validation

The automated scan uses axe-core WCAG 2 A/AA, 2.1 A/AA and 2.2 AA tags. It covers the implemented templates and tested states. The site targets WCAG 2.2 AA, includes an accessibility statement and maintenance policy, and avoids claiming independent certification. Published videos require captions and a transcript; uploaded images require author-supplied alt text.

A person must still verify the accuracy of descriptions/captions/transcripts, meaning and reading order of future content, and complete assistive-technology use with NVDA/VoiceOver and other supported combinations. The installed Node/runtime and test environment do not substitute for testing the user's Windows host, HTTPS reverse proxy, DNS, firewall, browser mix, or real SMTP account.

## Delivery scope

The release contains application source, locked dependencies, local fonts/licenses, configuration examples, setup/start launchers, tests and operational documentation. It excludes installed dependencies, compiled machine-specific build output, real credentials, databases containing QA accounts or inquiries, internal screenshots and temporary test browsers. The database is created and seeded when the installed application is initialized.
