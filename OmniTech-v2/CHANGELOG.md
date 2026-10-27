# Version 2.1.0 — October 24, 2026

- Added coordinated light/dark themes and a Follow device option across public and admin views.
- Added browser-persisted preferences, device-change handling, cross-tab synchronization, and pre-paint initialization.
- Added independently uploaded light/dark logos with alt text, fixed-background previews, and published default appearance.
- Kept existing shared branding as fallback; no account, content, or database reset.
- Removed forced logo backing colors and kept source images free of color inversion.
- Applied semantic light colors to forms, cards, navigation, service illustrations, and admin components.
- Improved narrow-screen and enlarged-text reflow, keyboard appearance controls, and reduced-motion handling.
- Updated privacy and accessibility pages for the new appearance control.
- Added password-confirmation retries in the local administrator setup/recovery prompt.
- Added UPDATE-WINDOWS.bat, upgrade guidance, 14 theme unit tests, and an integrated browser test suite.
- Switched typography to native system font stacks; no font binaries are bundled.
- Validation limitations and required local build checks are documented in docs/VERIFICATION-2.1.md.

---

# Version 2.0.0 — October 24, 2026

- Reconstructed the missing project configuration and bundled local fonts.
- Added SQLite-backed account, content, quotation, mail-outbox and engagement storage.
- Added owner/admin accounts with protected sessions and first-owner setup.
- Replaced static service/project content with published database records and preserved seed concepts.
- Added editable business branding, homepage/About content, mission and vision.
- Added announcements/promotions with date scheduling and publication states.
- Added safe image upload, alt text, service-based project categories, technologies and creative deliverables.
- Preserved the opportunity, proposed approach and demonstrated result in portfolio details.
- Added quotation records, status/notes management, CSV export and configurable multi-recipient SMTP notifications.
- Added privacy-aware engagement reports and an analytics opt-out.
- Improved typography, focus, keyboard use, mobile reflow and reduced-motion handling.
- Added accessibility statement/policy and operational backup/recovery documentation.
