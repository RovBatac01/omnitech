# Database, storage, and recovery

## Storage model

The server uses a persistent SQLite database at `data/omnitech.sqlite`, configurable with `SQLITE_PATH`. Uploaded files live in `data/uploads`, configurable with `UPLOAD_DIR`. Relative paths resolve from the project working directory. Run application and worker commands from the project root so both use the same data locations.

Startup enables WAL journaling, foreign keys, and a five-second busy timeout. Statements bind input parameters. Multi-record operations use `BEGIN IMMEDIATE` transactions. Each server process maintains its own database connection; the website and mail worker coordinate through SQLite and delivery leases.

Use one persistent host/filesystem for this version. Ephemeral serverless storage or multiple machines with independent database copies will not share content or inquiries. A client/server database would be a separate migration.

## Existing schema

The schema is defined in `src/lib/db.ts`. It initializes only when `meta.initialized` is absent. `meta.schema_version` is `1`; there are no historical migrations to apply to the original static source upload.

| Table | Key fields and stored content | Relationships and constraints |
| --- | --- | --- |
| `meta` | `key`, `value`. Holds JSON website settings and notification recipients, a random privacy hashing salt, initialization timestamp, and schema version. | `key` is the primary key. Secrets used for SMTP stay in the host environment, not this table. |
| `users` | UUID `id`, name, email, scrypt `password_hash`, role, active flag, creation time. | Email is unique with case-insensitive comparison. Role is constrained to `owner` or `admin`. Password hashes contain a random salt; plaintext passwords are not stored. |
| `sessions` | Hashed random `token_hash`, `user_id`, CSRF token, expiry in epoch milliseconds, creation time. | `user_id → users.id`, cascading deletion. Expiry index supports cleanup. Raw session-cookie tokens are not stored. |
| `content` | UUID `id`, kind, slug, status, sort order, JSON `data`, updated time. | Kind is services/projects/announcements; status is draft/published. `(kind,slug)` is unique. Index covers kind/status/order. |
| `inquiries` | UUID `id`, unique submission UUID, unique reference, normalized-payload hash, client contact fields, selected service, subject/message, contact preference, consent time, workflow status, notes, created/updated times. | Submission and reference values are unique. Indexes support newest-first ordering and status filtering. No public lookup by reference is provided. |
| `outbox` | UUID `id`, `inquiry_id`, recipient, delivery status, attempt count, sanitized error, next-attempt time, lease expiry/token, SMTP acceptance time, creation time. | `inquiry_id → inquiries.id`, cascading deletion. `(inquiry_id,recipient)` is unique. Due-work index covers status/next attempt/lease. |
| `events` | Integer `id`, keyed session hash, public pathname, event name, short label, creation time. | Event is constrained to page_view/cta_click. Date and session/date indexes support reporting. Raw IP addresses, URL query strings, and messages are not collected here. |
| `audit_log` | UUID `id`, actor identifier, action, short detail, creation time. | Records meaningful admin activity. Actor is retained as text so operational history survives account lifecycle changes. It is not a full content revision archive. |
| `rate_limits` | Keyed bucket identifier, count, expiration in epoch milliseconds. | Primary key identifies the bucket. Expired buckets are removed during rate-limit checks. Client-address buckets contain a keyed hash, not a raw address. |
| `uploads` | Generated filename, MIME type, byte size, creation time. | The filename identifies the corresponding file in `UPLOAD_DIR`. Files use random names and are immutable after creation. |

### Relationships held inside content JSON

Projects store `serviceSlugs[]` inside their JSON document. The API verifies those slugs against the service catalog. Renaming a service updates these arrays in the same transaction; deletion is blocked while any project refers to the service. These are application-level relationships rather than SQL foreign keys.

Image/logo/caption URLs inside content/settings point to registered uploaded files. The API checks that the record and file exist and that their MIME type matches the field. There is no automatic removal of unused uploaded files, because a file can be reused by several entries. Administrators should avoid uploading confidential assets; media is publicly available by URL even when its associated entry is a draft.

## Initial data and updates

On first startup, one transaction inserts the uploaded catalog's 13 services, the three existing concept projects, editable proposed mission/vision and site settings, and the initial notification recipient `rovicbatacandolo@gmail.com`. It does not create a password, publish promotions, invent completed projects, or insert synthetic analytics/inquiries.

Run `npm run setup` to create the first owner. Later application startups preserve the database instead of overwriting edited content. Rebuilding the code does not intentionally reset data. Do not ship a development/test database into production; use the empty data directory supplied in the package and initialize your own owner.

Content saves use the last valid save as the current value. There is no optimistic conflict detection or full revision history. The `updated_at` field and audit entries provide activity timestamps, while protected backups provide recovery points.

## Quotation and delivery transaction

One transaction inserts the inquiry and a separate outbox row for every current recipient. A repeated submission UUID with the same normalized-payload hash returns the existing receipt. The same key with changed content returns a conflict.

Workers select eligible rows under a write transaction and reserve a two-minute lease. Each recipient has its own attempt count and result, so a failure at one address does not reset another address's accepted notification. SMTP success is recorded only when the intended recipient appears in the provider's accepted list.

Automatic failures retry with backoff, up to eight attempts. Manual retry resets eligible failed attempts and adds newly configured recipients but preserves rows already marked sent. A provider accepting a message immediately before the process crashes remains an ordinary at-least-once-delivery edge case. The deterministic Message-ID aids recognition; this implementation does not promise exactly-once delivery or inbox placement.

## Time, reports, and retention

Business records use ISO UTC timestamps. Dashboard day boundaries and quotation-reference dates use Asia/Manila (UTC+08). Announcement editors serialize their Manila dates to ISO timestamps before saving. Session/lease/limit expiry fields use epoch milliseconds.

`npm run prune` previews the records eligible for retention cleanup. `npm run prune -- --apply` performs the deletion:

- Inquiries older than the configured `inquiryRetentionDays` (365 initially, configurable from 30 to 3,650). Related outbox rows cascade.
- Analytics events older than 90 days.
- Audit entries older than 365 days.
- Expired sessions and rate-limit buckets.

Pruning is explicit; it is not automatically destructive on application startup. Schedule it on the hosting computer after backups if the business wants an enforced retention routine. SQLite deletion does not imply forensic erasure from historical backups or storage media.

## Backup and restore

Run `npm run backup`. The script uses SQLite's online backup API to create a consistent database snapshot, then copies uploaded media into a dated directory under `backups` (or `BACKUP_DIR`). This avoids treating a live WAL-mode database file as a standalone copy. The snapshot also includes users, sessions, settings, inquiries, delivery state, analytics, and audit records. It does not copy environment credentials; preserve those separately in the host's secret-management process.

A backup smoke test created an online snapshot, opened that snapshot with a new SQLite connection, and confirmed the 13 seeded services. Local TLS SMTP testing also exercised the actual transport separately from unit sender mocks; no real recipient was contacted.

Restore procedure:

1. Stop the website and mail worker. Keep a separate copy of the current data before replacing it.
2. Select the desired dated backup and copy `omnitech.sqlite` to the configured `SQLITE_PATH`.
3. Replace the configured upload directory with that backup's `uploads` directory.
4. While both processes remain stopped, remove stale `omnitech.sqlite-wal` and `omnitech.sqlite-shm` files belonging to the replaced database. Use the actual configured database basename if different.
5. Confirm ownership/write permissions and environment paths, then start the application. Sign in and verify representative content, images, and inquiry counts.

Backups contain client contact details and administrator hashes. Keep restricted copies away from the web-served directories and retain an off-host copy. A restored snapshot can contain previously queued mail: inspect its notification states before enabling the worker if the snapshot predates messages that were already delivered after that backup.


## Version 2.1 appearance extension

The public settings JSON additionally stores `logoLightUrl`, `logoLightAlt`, `logoDarkUrl`, `logoDarkAlt`, and `defaultTheme` (`light`, `dark`, or `system`). The existing admin settings read/PATCH endpoint handles these fields with the same authentication, CSRF, and image registration checks. Dedicated image references require alternative text. Existing `logoUrl` / `logoAlt` remain supported. Read-time defaults populate absent keys; no SQL schema migration or reset is needed. See `THEMING.md`.
