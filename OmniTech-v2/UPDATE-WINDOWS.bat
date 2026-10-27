@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 is required. Install it before updating.
  goto :failed
)
node -e "if(Number(process.versions.node.split('.')[0])!==24){console.error('Use Node.js 24 for this application. Found '+process.versions.node);process.exit(1)}"
if errorlevel 1 goto :failed
if not exist .env.local (
  echo Existing .env.local was not found in this folder.
  echo Copy the upgrade INTO your existing project folder, keeping its data and configuration.
  echo For a genuinely new installation, use the full-system ZIP and SETUP-WINDOWS.bat.
  goto :failed
)
echo.
echo OmniTech 2.1 UI update. Stop the server and back up the existing folder first.
echo Your database, uploads, administrator accounts and SMTP settings will not be reset.
echo.
if not exist node_modules\.bin\next.cmd goto :install
if not exist node_modules\.bin\tsc.cmd goto :install
if not exist node_modules\tsx\package.json goto :install
goto :checks
:install
echo Installing the unchanged locked dependencies. Internet access is required.
call npm ci
if errorlevel 1 goto :failed
:checks
call npm run typecheck
if errorlevel 1 goto :failed
call npm run test:themes
if errorlevel 1 goto :failed
call npm run build
if errorlevel 1 goto :failed
echo.
echo Update complete. Run START-WINDOWS.bat, then refresh your browser with Ctrl+F5.
echo Admin: Website settings - Appearance and logos.
pause
exit /b 0
:failed
echo.
echo Update stopped. Read the error above. Do not delete your data or recreate your owner account.
echo See UPGRADE-2.1.md for safe upgrade and rollback instructions.
pause
exit /b 1
