# API reference

This is the API implemented by the supplied application. It is a same-origin browser API. Public pages read published content through server-side CMS functions; there is no public endpoint exposing administrator settings, client lists, or inquiry messages.

## Request and authentication rules

- Public mutations and login require an `Origin` equal to `APP_ORIGIN`. Authenticated mutations also require the `x-csrf-token` returned by login or the session endpoint.
- Administrators authenticate with the HttpOnly `omnitech_session` cookie. It expires after eight hours, uses `SameSite=Strict`, and adds `Secure` when `APP_ORIGIN` uses HTTPS. No bearer token API is implemented.
- JSON routes require `Content-Type: application/json`. Ordinary administration bodies are bounded at 128 KiB; login/password bodies at 4 KiB; contact bodies at 20,000 bytes; analytics bodies at 2,048 bytes. Streaming bodies are checked as they are read.
- JSON errors use `{ "message": "…", "errors": { "fieldName": "How to fix it" } }`. The `errors` object is optional. Error responses do not expose SQL, password hashes, SMTP credentials, or stack traces.
- Status codes include `400` invalid input, `401` not signed in, `403` failed authorization/Origin/CSRF, `404` missing entry or endpoint, `409` an idempotency or referenced-content conflict, `413` oversized body, `415` wrong content type, and `429` rate limiting.
- Admin JSON and CSV responses use private/no-store cache controls. Shared client-safe response types are in `src/types/cms.ts`.

## Public endpoints

| Method and path | Input | Result |
| --- | --- | --- |
| `POST /api/contact` | Quotation fields described below | `201` for a new stored request; `200` for an identical repeated submission. Returns `message`, `reference`, and `emailStatus`. |
| `POST /api/analytics` | `sessionId`, `path`, `event`, optional `label` | `204`. Excluded events also return `204` without storing anything. |
| `GET /media/{filename}` | Exact generated WebP or VTT filename | Uploaded bytes with explicit content type, immutable caching, nosniff, and a restrictive content policy. Missing or unsafe names return `404`. |

### Quotation request

Required fields are `name` (2–100 characters), `email` (valid email, up to 254 characters), `message` (20–5,000 characters), `consent: true`, and a UUID `submissionId`. Optional fields are `phone`, `company`, `service`, `subject`, and `preferredContactMethod` (`email` or `phone`, default `email`). A phone preference requires a phone number. `service` must be the slug or alias of a currently published service. The honeypot `website` field must be empty.

The server stores the request and recipient notification records in one transaction before attempting delivery. One notification is attempted during submission; the worker processes remaining recipients and retries. With no SMTP configuration, the request still succeeds and `emailStatus` is `not_configured`.

Keep the same `submissionId` when retrying a request after an uncertain network result. The same normalized payload returns the original reference without creating another inquiry or triggering another immediate send. Reusing the key for different content returns `409`. Generate a new key for a new request.

The public response does not return the client's stored message or contact fields. A reference number is a receipt identifier, not a public login or lookup credential. There is no public inquiry-reading endpoint.

### Analytics event

`sessionId` is a browser-generated UUID. `event` is `page_view` or `cta_click`. `path` is a public website pathname without query strings, fragments, or external hosts. `label` is limited to 100 characters. Admin, API, media, and Next.js internal paths are rejected. The server ignores events when analytics are disabled, the request belongs to a signed-in administrator, DNT is `1`, or GPC is `1`. Near-identical events within two seconds are deduplicated.

These figures estimate browser sessions and interactions; they do not establish a count of verified people. Dashboard date boundaries use Asia/Manila.

## Authentication and account endpoints

| Method and path | Access | Input / result |
| --- | --- | --- |
| `POST /api/admin/login` | Public, matching Origin | `{email,password}` → `{user,csrfToken}` and a session cookie. Invalid credentials return a generic error. |
| `GET /api/admin/session` | Signed-in admin or owner | `{user,csrfToken}`; `401` when missing, expired, or disabled. |
| `POST /api/admin/logout` | Signed in + CSRF | Revokes the current session and clears its cookie. |
| `POST /api/admin/password` | Signed in + CSRF | `{currentPassword,newPassword}`. New password/passphrase: 12–128 characters. Revokes all sessions for that user. |
| `GET /api/admin/users` | Owner | `{items: AdminUser[]}` without password hashes. |
| `POST /api/admin/users` | Owner + CSRF | `{name,email,password,role}` where role is `owner` or `admin`; returns `{item}`. |
| `PATCH /api/admin/users/{id}` | Owner + CSRF | Optional `name` and `active`. Cannot disable yourself or the last active owner. Disabling an account revokes its sessions. |

There is no public registration or email-based password recovery flow. Create the first owner using `npm run setup`. Recover a password on the trusted server console using `npm run admin -- reset-password owner@example.com`.

## Content and settings

`kind` is exactly `services`, `projects`, or `announcements`.

| Method and path | Access | Input / result |
| --- | --- | --- |
| `GET /api/admin/content/{kind}` | Admin or owner | `{items}` including drafts. |
| `POST /api/admin/content/{kind}` | Admin or owner + CSRF | Complete editor payload; returns `{item}` with assigned ID and timestamp. |
| `PATCH /api/admin/content/{kind}/{id}` | Admin or owner + CSRF | Complete editor payload; returns `{item}`. This endpoint validates a complete content document rather than merging arbitrary partial fields. |
| `DELETE /api/admin/content/{kind}/{id}` | Admin or owner + CSRF | Deletes the entry. A service referenced by a project returns `409`; recategorize the project first or save the service as draft. |
| `GET /api/admin/settings` | Admin or owner | `{settings,mail:{configured,recipients}}`. SMTP credentials are never returned. |
| `PATCH /api/admin/settings` | Admin or owner + CSRF | `{settings?: Partial<SiteSettings>, recipients?: string[]}`. Settings merge with existing values. Only owners may supply `recipients`; 1–10 valid, distinct addresses are allowed. |
| `POST /api/admin/upload` | Admin or owner + CSRF | Multipart field `file`; returns `{url,name}`. |

All content entries have an ID, unique per-kind slug, title, `draft`/`published` status, numeric ordering, featured flag, and `updatedAt` timestamp. The complete field definitions are in `src/types/cms.ts`:

- **Services:** descriptive copy, short label, category/filter group, icon, features, benefits, outcome, aliases, and official/featured flags. Renaming a service preserves its old slug as an alias and updates associated project categories.
- **Projects:** description, one or more existing service slugs, technology stack, creative-work types, concept/completed designation, optional image with alt text, opportunity, approach, demonstration/outcome, optional client/date, and optional video/captions/transcript. Published video entries require captions and a transcript.
- **Announcements:** announcement/promotion designation, title, summary, body, optional image with alt text, CTA label/URL, and optional ISO start/end timestamps. Public readers enforce both publication and schedule; an end timestamp must follow its start.
- **Settings:** business name, logo/alt text, contact details, hero copy, About copy, mission/vision, final CTA, social links, analytics toggle, accessibility contact, and inquiry retention days.

Images must be genuine PNG, JPEG, or WebP input, at most 5 MiB and 32 megapixels. The server rotates and normalizes them to WebP at a maximum dimension of 2,400 pixels and strips source metadata. Captions accept UTF-8 WebVTT up to 1 MiB. SVG/executable uploads are not accepted. Attached image/logo/caption fields must refer to an existing upload with the correct MIME type. Uploaded assets are public by their generated URL, including assets not yet attached to published content.

External CTA/video/social addresses must use HTTPS; safe internal paths are also supported. Text content is rendered as text by the application; there is no administrator-supplied HTML execution feature.

**Editing concurrency:** this version does not implement content revision history, optimistic version checks, or collaborative locking. A later valid save replaces the current document. `updatedAt` and audit entries show activity but do not reconstruct earlier content. Coordinate simultaneous edits to the same entry and refresh before editing another administrator's recent changes.

## Inquiry workflow and reporting

| Method and path | Access | Input / result |
| --- | --- | --- |
| `GET /api/admin/dashboard?days=30` | Admin or owner | `DashboardData`. Supported periods: `7`, `30`, `90`; other values use `30`. Includes totals, daily counts, top pages, recent inquiries/activity, and mail configuration status. |
| `GET /api/admin/inquiries?q=&status=&page=1` | Admin or owner | `{items,total,page,pageSize}`. Page size is 25. Search matches name, email, company, or reference. Page values are bounded; invalid page text falls back to 1. |
| `PATCH /api/admin/inquiries/{id}` | Admin or owner + CSRF | `{status?,notes?}` → `{item}`. Status: `new`, `contacted`, `quoted`, `closed`, `spam`; notes up to 10,000 characters. |
| `DELETE /api/admin/inquiries/{id}` | Owner + CSRF | Permanently deletes the inquiry and associated outbox rows. |
| `POST /api/admin/inquiries/{id}/retry` | Admin or owner + CSRF | Requeues eligible notifications; returns `{message,status}` where status is an email status below. |
| `GET /api/admin/inquiries/export` | Admin or owner | UTF-8 CSV of the saved inquiries. Formula-like cells are prefixed with an apostrophe. Export activity is audited. |

Email statuses are `pending`, `not_configured`, `failed`, and `sent`. `sent` means every active target notification was accepted by SMTP, not guaranteed placement in the recipient's inbox. Status reports include attempt counts and sanitized delivery errors.

Each recipient has an independent outbox entry. An explicit retry never resets a recipient already accepted by SMTP. It enrolls newly configured recipients missing from that inquiry; removed recipients are suppressed before sending. There is no automatic client acknowledgment email, bounce webhook, campaign mailer, or public reply endpoint. The notification uses the client's address as Reply-To so the team can respond from its normal email application.


## Version 2.1 appearance extension

The public settings JSON additionally stores `logoLightUrl`, `logoLightAlt`, `logoDarkUrl`, `logoDarkAlt`, and `defaultTheme` (`light`, `dark`, or `system`). The existing admin settings read/PATCH endpoint handles these fields with the same authentication, CSRF, and image registration checks. Dedicated image references require alternative text. Existing `logoUrl` / `logoAlt` remain supported. Read-time defaults populate absent keys; no SQL schema migration or reset is needed. See `THEMING.md`.
