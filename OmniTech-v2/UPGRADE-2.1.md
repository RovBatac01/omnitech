# Upgrade OmniTech 2.0 / 2.0.1 to 2.1.0

## What changes

Light, Dark, and Follow device appearance are available on the public site, admin sign-in, and admin workspace. Website settings now has an **Appearance & logos** section with separate light-mode and dark-mode image uploads, independent alternative text, fixed-background previews, and a default appearance choice. Existing content, users, inquiries, mail recipients, and uploads are not reset.

## Windows: update your existing installation

1. Stop OmniTech with **Ctrl+C** in the window running the server. Stop any separate development server or mail worker too.
2. Make a backup copy of your entire existing project folder while it is stopped. Keep that backup outside the live folder. It should include `data`, `.env.local`, and any custom upload/database locations configured in `.env.local`.
3. Extract `OmniTech-v2.1-UI-Upgrade.zip` into a temporary folder. Open its `OmniTech-v2` folder.
4. Copy the **contents** into the existing project folder that contains `package.json` and `START-WINDOWS.bat`. Merge matching folders and replace the supplied code files. Do not create an extra nested `OmniTech-v2` folder inside your installation.
5. **Keep your existing `.env.local`, `data` folder, uploads, backups, and any custom persistent storage.** The upgrade ZIP contains none of these. No administrator creation or database reset is required. Do not run SETUP-WINDOWS for an existing installation.
6. Double-click **UPDATE-WINDOWS.bat**. It checks for Node 24, checks for an existing configuration, uses installed dependencies when available (no dependency versions were changed), runs TypeScript checks and the new isolated theme tests, and rebuilds the website. If dependencies are absent, it runs `npm ci` first; that needs internet access.
7. Only after the update script completes successfully, run **START-WINDOWS.bat**. Reload the browser with **Ctrl+F5**.
8. Verify the homepage, admin sign-in, saved website content, quotation inbox, and both appearances. Submit a test inquiry only when you are prepared for its configured notification emails.

The update script does not run first-owner setup, delete your database, overwrite SMTP credentials, or start the website automatically. If a check or build fails, it stops. Save the exact terminal output; do not delete your data to retry.

### Equivalent commands

From the existing project directory after copying the upgrade files:

```powershell
# Only needed when dependencies are missing or need a clean reinstall:
# npm ci
npm run typecheck
npm run test:themes
npm run build
npm start
```

Use Node.js 24 as required by the original application. Dependency versions remain the same as in the uploaded system. Installed dependencies and compiled output are not bundled.

## Upload the two logos

Open **Admin → Website settings → Appearance & logos**.

- **Light mode logo file:** upload a dark or full-color logo that works on white / pale mint.
- **Dark mode logo file:** upload a white or light-colored logo that works on deep teal.
- Enter meaningful alternative text for each logo, normally your business name.
- Choose **Default website appearance**: Light, Dark, or Follow device.
- Select **Save website settings**. The save button waits while either new logo upload is in progress.

PNG, JPEG, and WebP are supported up to 5 MB. Transparent PNG or WebP is recommended for logos. Images are displayed without CSS color inversion or forced white backing. A white background actually embedded in the uploaded pixels cannot be made transparent by a theme switch.

Each preview stays on its intended background. The “Preview light mode” / “Preview dark mode” buttons change your current browser appearance, not the published setting. Save publishes logo and default-setting changes.

The public header, homepage hub, footer, admin sign-in, and admin sidebar choose the matching logo automatically. A browser’s saved appearance takes priority over the administrator’s default. A fresh browser or a browser with its site data cleared uses the default.

## Existing-logo fallback

No SQL schema reset or manual migration is required. Old stored settings are merged with the new defaults at read time. The previous shared logo remains available under **Existing shared logo (fallback)**.

For each appearance: use its dedicated logo; otherwise use the legacy shared logo; otherwise use the other appearance’s logo; otherwise show the business-name wordmark. Upload both dedicated variants to guarantee different artwork in each mode. The other logo is never automatically inverted or recolored.

## Release validation

Read `docs/VERIFICATION-2.1.md`. The new isolated theme/settings tests and static browser layout checks passed. A full Next.js build, project-wide typecheck, and live integrated browser tests could not be executed in the delivery environment because the pinned dependencies could not be downloaded and Node 24 was unavailable there. The update script performs local type checking, the theme tests, and the production build before reporting success.

## Roll back

Stop the server. Restore the backed-up project folder and restart it using its original commands. This update stores only additional settings keys and does not remove older database fields. Keep the backup and any new inquiry records received after upgrading; do not overwrite a newer database casually.
