# Verification record — OmniTech 2.1.0

Date: October 24, 2026. This is the verification record for the light/dark and two-logo upgrade. The uploaded project's `VERIFICATION.md` is an inherited 2.0.0 record, not evidence that this release has passed a full build.

## Executed in this environment

| Check | Observed result | Scope |
| --- | --- | --- |
| TypeScript/TSX syntax transpilation | 86 files, 0 syntax diagnostics | Global TypeScript 5.8.3 transpileModule; this is not project-wide type checking |
| New theme/settings unit tests | 14 passed, 0 failed | Actual theme helpers, initialization script, validation, and SQLite settings; temporary database only |
| Browser static-layout checks | 60 configurations, 0 horizontal page overflow failures | Six component-derived HTML fixtures, both themes, widths 1440/1024/390/320; additional 320px at 200% root text |
| Visible theme-logo styles | Matching image visible; inactive variant hidden; transparent CSS background | Fixture DOM with synthetic transparent test logos; not user artwork |
| Visual inspection | Light homepage, dark homepage, and two-logo admin panel reviewed | Static Chromium snapshots, not a hydrated Next.js deployment |

Unit tests ran on the available Node 22.16.0 after TypeScript transpilation to CommonJS and alias resolution. The actual application still requires Node 24. SQLite tests exercised default merging, independent logo persistence, retained legacy content, missing-alt rejection, unsafe/unregistered URL rejection, valid theme values, and partial-settings updates. No real user database or SMTP account was accessed.

Static fixtures were generated from component markup with mocked React initialization and navigation dependencies. They use the actual CSS, but placeholder icons and test logos. They do **not** test React hydration, click handlers, Next routing, API authentication, actual upload processing, or integrated admin saves. Layout checks are not equivalent to full browser acceptance testing or accessibility certification.

## Not executed here

The sandbox could not resolve/download the pinned npm dependencies and had Node 22 rather than Node 24. Therefore, `npm run typecheck`, the production `npm run build`, the full inherited backend suite, and the new integrated Playwright/axe suite were **not run**. No claim of a successful production build, zero axe violations, or dependency audit for 2.1 is made.

## Required local acceptance

`UPDATE-WINDOWS.bat` runs the project-wide typecheck, the new theme unit tests, and the production build using the user's Node 24 installation before reporting success. It does not claim to run the integrated browser suite.

For integrated testing after a successful build:

```powershell
npx playwright install chromium
npm run test:e2e:themes
npm run test:e2e
```

Tests use the isolated `qa/e2e` database with SMTP disabled. Review failures and manually verify screen-reader behavior, mobile menus, both real logos, actual content contrast, and upload/save workflows before public deployment. A complete WCAG conformance review remains outside this release's demonstrated validation.

## Preservation and delivery

There is no SQL schema reset. The upgrade ZIP excludes credentials, databases, uploads, installed dependencies, build output, test credentials, and font binaries. The full-system ZIP includes only source, lockfile, example configuration, and documentation. Neither ZIP sends email or changes a running installation by itself.
