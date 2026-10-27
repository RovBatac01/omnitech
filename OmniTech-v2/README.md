# OMNITECH — Website & Admin Platform

**Version 2.1.0 · October 24, 2026**

A complete rebuild of the supplied Next.js source with an editable website, private administration, SQLite-backed quotations, email notifications, and engagement reporting. It now includes coordinated light and dark appearances, separate logo uploads for each mode, device-following preferences, and an updated appearance editor. The dark teal technology identity and code-drawn visuals are preserved.

## Already using OmniTech 2.0 / 2.0.1?

Use [UPGRADE-2.1.md](UPGRADE-2.1.md) and **UPDATE-WINDOWS.bat**. Keep your database, uploads, and `.env.local`; do not create your administrator again. See [the 2.1 verification record](docs/VERIFICATION-2.1.md) for completed checks and the production build/browser tests still to run locally.

## Light mode, dark mode, and two logos

Open **Admin → Website settings → Appearance & logos**. Upload a light-mode logo and a separate dark-mode logo, add their alternative text, choose a default appearance, and save. Each preview has its own background. The appearance button in the public header, login page, and admin toolbar offers Light, Dark, and Follow device. A visitor's saved browser choice takes priority over the default. Your existing shared logo is retained as a fallback.

## Start on Windows — new installation only

1. Install **Node.js 24 LTS** from [nodejs.org](https://nodejs.org/). XAMPP and MySQL are not required.
2. Extract this entire folder to a normal local directory, such as `C:\OmniTech`. Do not run the application from inside the ZIP.
3. Double-click **SETUP-WINDOWS.bat**. It installs the locked dependencies, creates `.env.local` from the example if needed, asks you to create the first owner account, and builds the site.
4. Choose an administrator email, display name, and a password/passphrase of at least 12 characters. There is no shared or default admin password.
5. Double-click **START-WINDOWS.bat**. Keep its window open while using the website.
6. Open the website at **http://localhost:3000** and administration at **http://localhost:3000/admin**.

If dependency installation or compilation fails, read the error before repeating setup. If an owner already exists, use the commands below instead of running first-account setup again. A fresh dependency installation needs internet access; the website uses native system fonts and local code-drawn artwork, with no external font download.

### Terminal commands

Run these commands in the extracted project directory:

```powershell
Copy-Item .env.example .env.local
npm ci
npm run setup
npm run build
npm start
```

On Linux/macOS, use `cp .env.example .env.local` for the first command. Do not overwrite an existing configured `.env.local`.

For future code updates, run `npm ci`, then `npm run build`, then restart. **Routine content changes in the admin panel do not require rebuilding or editing code.**

For development, use `npm run dev`. The development server does not supervise the separate retry worker; run `npm run mail:worker` in a second terminal when developing email delivery. Production `npm start` starts both automatically and stops both when you stop the launcher.

## What you can manage

| Admin area | Available controls |
| --- | --- |
| Overview | Real page views, estimated browser sessions, quotation totals, CTA clicks, top pages, daily activity, recent inquiries and administrator activity |
| Quotation inbox | Search, status filter, client details, internal notes, new/contacted/quoted/closed/spam statuses, email status, retry, email reply link, CSV export; owners can permanently delete a record |
| Solutions & services | Add/edit/delete services, categories, service details, benefits, outcomes, icons, feature flags, order, draft/published status and old URL aliases |
| Project portfolio | Add completed projects or concepts, upload an image with alt text, select one or more service categories, technology stack, creative deliverables, project description and three narrative sections |
| Announcements | Publish announcements and promotions; add images, body text and descriptive CTA links; choose a publication window in Philippines time |
| Website settings | Business name, separate light/dark logos and default appearance, public email/phone/address, hero text, About text, mission, vision, final CTA, social links, analytics switch and inquiry-retention setting |
| Email recipients | Owners can add up to ten quotation-notification recipients. The initial recipient is **rovicbatacandolo@gmail.com** |
| Accounts & security | Change your own password. Owners can create additional owners/admins and deactivate accounts. You cannot deactivate yourself or the final active owner |

### Initial content

The complete original service catalog is included:

1. Search Engine Optimization (SEO) Consulting
2. Cybersecurity Consulting
3. Mobile App Development
4. Web Design and Development
5. Remote Tech Support & IT Helpdesk
6. CCTV Installation
7. Queuing System
8. Video Content Creation
9. Social Media Marketing
10. Network Infrastructure
11. Custom Software Development
12. Cloud & Data Solutions
13. Computer Hardware & Equipment

The three original portfolio entries remain labeled **Concept project**. They are not represented as completed client work. New entries can be marked **Completed**. No fabricated client inquiries, visitor counts, discount offers, or testimonials are seeded. The supplied mission and vision are editable proposed wording.

### Publish a completed project

Open **Project portfolio → Add project**. Add a title, description, readable address/slug, image and descriptive alternative text. Select the applicable services. List technologies such as React, TypeScript or networking platforms, and creative deliverables such as video editing, photo editing, content creation or social media graphics.

Complete these narrative fields:

- **The opportunity**: the problem, need or improvement the project addressed.
- **The proposed approach**: how the work was planned and delivered.
- **What the concept demonstrates / project outcome**: the capability, result or benefit that can be accurately described.

Choose Concept or Completed, add client/completion details where appropriate, and save as a draft or publish. Published content is read from the database on the next page request. If you rename a service, its previous address is preserved as an alias and existing project categories stay connected. A service used by a project cannot be deleted until that project is recategorized.

### Announcements and promotions

Start with a draft, add the title and details, then publish. Start/end schedules are entered in **Asia/Manila** time and stored as UTC. Future and expired posts stay out of public listings and their detail pages. The homepage announcement section appears when an eligible post is published. Promotions use the same authoring workflow; you decide the actual offer and its terms.

## Enable email notifications

The website already stores quotations without SMTP. To send copies to your inbox, configure the sending account in `.env.local`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=rovicbatacandolo@gmail.com
SMTP_PASS=YOUR_GOOGLE_APP_PASSWORD
SMTP_FROM=rovicbatacandolo@gmail.com
```

Use your Google **App Password**, not your ordinary Google password. Google requires 2-Step Verification for App Passwords, and some account configurations do not offer them. See [Google's official App Password instructions](https://support.google.com/accounts/answer/185833). Keep this password in the server environment only; do not paste it into public code, upload it to source control, or send it through a client-side form. Restart the website after changing environment values.

You can also use an SMTP provider authorized for your business domain. Use the hostname, authentication, TLS port, and authorized sender required by that provider. For STARTTLS on port 587, set `SMTP_PORT=587` and `SMTP_SECURE=false`; the application still requires TLS before sending.

Manage destinations in **Website settings → Quotation notification recipients**. Public contact email and notification recipients are separate settings: changing one does not silently change the other. SMTP sender credentials remain outside the admin browser.

### What happens when a visitor submits

1. The server validates the details and privacy consent.
2. SQLite saves the inquiry and assigns an `OM-...` reference number.
3. A separate notification is queued for each configured recipient.
4. The first recipient is attempted immediately; the background worker handles the rest and failed attempts.
5. The client sees confirmation that the request was saved. Administrators can open it even if SMTP is unavailable.

A stable submission ID prevents a retry after an interrupted connection from creating a duplicate inquiry. Changing an already-used submission's details is rejected rather than silently changing the saved request.

Notifications contain the client's email as **Reply-To**, so replying in your email application targets the client. This version does not send automatic marketing subscriptions or quotation acknowledgements to client email addresses. It stores form submissions and email-delivery status; it does not import an existing Gmail inbox.

An SMTP status of accepted/sent means the provider accepted the notification. It does not guarantee inbox placement, reading, or delivery past spam filtering. Failed recipients retry with backoff, up to eight automatic attempts; an administrator can explicitly retry. Already accepted recipients are not intentionally resent. Standard crash-after-SMTP-acceptance ambiguity remains, as described in the operations guide.

## Data, backup and account recovery

Persistent data lives in:

- `data/omnitech.sqlite`: accounts, sessions, content, settings, inquiries, outbox, analytics and audit records.
- `data/uploads/`: uploaded project/announcement images, logos and captions.

A new installation creates its own database. **Two computers running independent copies do not automatically share records.** To share one public site and admin workspace, run one central server and access that website from each device.

Back up the complete application data regularly:

```bash
npm run backup
```

This creates a consistent SQLite snapshot plus a copy of uploaded media. Keep a protected copy on another device or backup destination. Protect backups because they contain client contact details. See `docs/DATABASE.md` for restore steps.

Recover an administrator password from a trusted terminal on the server:

```bash
npm run admin -- reset-password owner@example.com
```

It prompts for a new passphrase and signs out existing sessions for that account. No unauthenticated website endpoint can create the first owner or reset an administrator password.

### Retention

The default inquiry-retention setting is 365 days. Preview records eligible for removal:

```bash
npm run prune
```

After reviewing the preview and creating a backup, apply it explicitly:

```bash
npm run prune -- --apply
```

Analytics older than 90 days and audit entries older than one year are also handled by this operation. The application does not automatically delete records at startup. Schedule maintenance on the host according to your chosen policy. Mailboxes and backup copies have separate retention arrangements.

## Accessibility and readable interaction

The implementation targets **WCAG 2.2 Level AA**. Public pages include an accessibility statement and an accessibility maintenance policy, with reporting contacts editable in the admin panel.

Implemented features include a 16px base body font, relative typography, stronger text/control contrast, 200% text-resize support, responsive layouts, descriptive links, semantic headings and landmarks, a skip link, visible keyboard focus, arrow-key tab navigation, labeled fields, text error descriptions, and reduced-motion handling. Hover/press feedback does not carry essential information. Images require alt text in the CMS. Publishing a project video requires an uploaded WebVTT caption file and a text transcript. Uploaded media still needs an author to verify that descriptions, captions and transcripts are accurate.

Font size alone does not establish conformance. Automated browser checks and the documented manual checks cover specific flows; they are not an independent certification of every criterion, device, screen reader, or future piece of content. Consult [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and `docs/VERIFICATION.md` for the precise validation scope.

## Engagement reporting

The dashboard shows **page views and estimated browser sessions**, not verified unique people. It also shows quotation-related clicks, inquiries, top public pages, and a daily activity table. Daily reporting uses Philippines time.

Public analytics use a random session-storage identifier; server-side identifiers are hashed. The website excludes signed-in administrator visits and respects Do Not Track, Global Privacy Control, and the local opt-out on the Privacy page. It does not add analytics email tracking or third-party advertising trackers. Browser blocking, session restoration, repeat visits and bots can affect counts. The site owner can disable analytics entirely in Website settings.

## Hosting and environment configuration

Use a **Node.js 24 server with persistent writable storage** for the SQLite database and uploads. The app must run as a server; it is not a static HTML-only export. Keep database files, backups and `.env.local` outside publicly served folders. Do not deploy this SQLite configuration to an ephemeral filesystem or several independent instances and expect them to share one database.

For a public HTTPS domain, set both origin values before building:

```dotenv
APP_ORIGIN=https://your-domain.example
NEXT_PUBLIC_SITE_URL=https://your-domain.example
BIND_HOST=127.0.0.1
PORT=3000
SQLITE_PATH=./data/omnitech.sqlite
UPLOAD_DIR=./data/uploads
```

Place your HTTPS reverse proxy in front of the local Node process. Make it preserve the correct host and Origin information, limit request sizes, and set the client address headers itself. Set `TRUST_PROXY=true` only when requests reach the application exclusively through that trusted proxy and its forwarded address cannot be chosen by an arbitrary client. Without trusted proxy configuration, rate limits deliberately share a conservative bucket. In production, the exact `APP_ORIGIN` must match the public browser origin; `localhost` and `127.0.0.1` are different origins.

For a temporary LAN preview, set `BIND_HOST=0.0.0.0` and use the server's LAN address in both origin settings. Use HTTPS for a real public deployment and administrator access. The application sets Secure session cookies for an HTTPS origin. Content changes do not need restarts; environment changes do.

## Technology stack

- Next.js 16 App Router, React 19 and TypeScript.
- Node.js 24 and built-in SQLite (`node:sqlite`).
- Nodemailer with TLS SMTP and a durable per-recipient outbox.
- Scrypt password hashing, database-backed sessions, Origin/CSRF checks, server-side roles and persistent rate limits.
- Sharp for validating and normalizing image uploads.
- Locally bundled Inter, Oxanium and Space Grotesk fonts; Lucide icons.
- Node's test runner, Playwright and axe-core for verification.

See `package-lock.json` for the exact resolved package versions.

## Verification commands

```bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests create an isolated database under `qa/e2e`, explicitly disable SMTP, and use generated test-only credentials. They do not touch `data/omnitech.sqlite`. Do not reuse that QA database as a production database. Test output is excluded from the release archive.

## Project map

```text
src/app/               Public pages, admin pages, APIs and media route
src/components/        Public interface and private admin workspace
src/lib/               Database, authentication, CMS, mail and validation
src/types/cms.ts        Shared content and API data types
public/fonts/          Local font files and their licenses
scripts/               Owner setup, server launcher, mail worker and maintenance
tests/                 Backend/form checks and browser scenarios
docs/                  API, database, operations and verification documentation
.env.example           Safe configuration template, without credentials
```

The source upload omitted its original package manifest and public fonts; this release restores those dependencies and assets. The old graphic logo and old social-preview artwork were replaced with configurable text branding and a new text-based preview. The screenshots supplied in `artifacts.zip` were design references and are not needed at runtime.
