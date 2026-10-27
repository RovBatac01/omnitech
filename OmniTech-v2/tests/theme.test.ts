import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isThemePreference, resolveTheme, themeLogos, themeInitScript, THEME_STORAGE_KEY } from '../src/lib/theme';
import { defaultSettings, getDb, setMeta, closeDatabase, uploadDirectory } from '../src/lib/db';
import { getPublicSettings, getServices } from '../src/lib/cms';
import { validateSettings } from '../src/lib/validation';
import { ApiError } from '../src/lib/security';
const root = mkdtempSync(join(tmpdir(), 'omnitech-themes-'));
function fresh() { closeDatabase(); const id = randomUUID(); process.env.SQLITE_PATH = join(root, id, 'app.sqlite'); process.env.UPLOAD_DIR = join(root, id, 'uploads'); return getDb(); }
function registerImage() {
  const name = `${randomUUID()}.png`; mkdirSync(uploadDirectory(), { recursive: true });
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z9wAAAABJRU5ErkJggg==', 'base64');
  writeFileSync(join(uploadDirectory(), name), bytes);
  getDb().prepare('INSERT INTO uploads(name,mime,size,created_at) VALUES (?,?,?,?)').run(name, 'image/png', bytes.length, new Date().toISOString());
  return `/media/${name}`;
}
after(() => { closeDatabase(); rmSync(root, { recursive: true, force: true }); });

test('accepts only the three supported appearance preferences', () => {
  for (const value of ['light', 'dark', 'system']) assert.equal(isThemePreference(value), true);
  for (const value of ['', 'LIGHT', null, undefined, {}, 'auto', '<script>']) assert.equal(isThemePreference(value), false);
});
test('explicit appearance wins; system follows the device', () => {
  for (const dark of [true, false]) { assert.equal(resolveTheme('light', dark), 'light'); assert.equal(resolveTheme('dark', dark), 'dark'); }
  assert.equal(resolveTheme('system', true), 'dark'); assert.equal(resolveTheme('system', false), 'light');
});
test('two distinct theme logos keep independent alternative text', () => {
  const logos = themeLogos({ ...defaultSettings, logoLightUrl: '/media/light.png', logoLightAlt: 'Omnitech dark lettering', logoDarkUrl: '/media/dark.png', logoDarkAlt: 'Omnitech light lettering' });
  assert.deepEqual(logos.light, { url: '/media/light.png', alt: 'Omnitech dark lettering' });
  assert.deepEqual(logos.dark, { url: '/media/dark.png', alt: 'Omnitech light lettering' });
});
test('a legacy shared logo survives and fills any missing theme', () => {
  const logos = themeLogos({ ...defaultSettings, logoUrl: '/media/legacy.png', logoAlt: 'Existing logo', logoDarkUrl: '/media/dark.png', logoDarkAlt: 'Dark theme logo' });
  assert.equal(logos.light.url, '/media/legacy.png'); assert.equal(logos.light.alt, 'Existing logo'); assert.equal(logos.dark.url, '/media/dark.png');
});
test('one uploaded theme logo falls back safely in the other theme', () => {
  const light = themeLogos({ ...defaultSettings, logoLightUrl: '/media/only-light.png', logoLightAlt: 'Logo' });
  const dark = themeLogos({ ...defaultSettings, logoDarkUrl: '/media/only-dark.png', logoDarkAlt: 'Logo' });
  assert.deepEqual(light.light, light.dark); assert.deepEqual(dark.light, dark.dark);
});
test('no uploaded logo leaves the text wordmark available', () => {
  const logos = themeLogos(defaultSettings); assert.equal(logos.light.url, ''); assert.equal(logos.dark.url, ''); assert.equal(logos.light.alt, defaultSettings.businessName);
});
function boot(defaultTheme: 'light' | 'dark' | 'system', saved: string | null, deviceDark: boolean, blocked = false) {
  const dataset: Record<string, string> = {};
  runInNewContext(themeInitScript(defaultTheme), {
    document: { documentElement: { dataset } }, window: { matchMedia: () => ({ matches: deviceDark }) },
    localStorage: { getItem: (key: string) => { assert.equal(key, THEME_STORAGE_KEY); if (blocked) throw new Error('Storage blocked'); return saved; } },
  }); return dataset;
}
test('pre-paint boot uses saved preference over admin default and device', () => {
  assert.deepEqual(boot('light', 'dark', false), { theme: 'dark', themePreference: 'dark' });
  assert.deepEqual(boot('dark', 'light', true), { theme: 'light', themePreference: 'light' });
  assert.deepEqual(boot('dark', 'system', false), { theme: 'light', themePreference: 'system' });
});
test('pre-paint boot survives blocked storage and ignores invalid values', () => {
  assert.equal(boot('system', null, false, true).theme, 'light');
  assert.equal(boot('system', null, true, true).theme, 'dark');
  assert.equal(boot('light', 'unexpected-value', true).theme, 'light');
  assert.equal(boot('dark', null, false).theme, 'dark');
});
test('boot script only interpolates an allowlisted default', () => {
  const script = themeInitScript('</script><script>alert(1)</script>' as 'dark');
  assert.ok(!script.includes('</script>')); assert.match(script, /"system"/);
});
test('old stored settings receive theme defaults without resetting content or accounts', () => {
  const db = fresh(); const old = { ...defaultSettings } as Record<string, unknown>;
  for (const field of ['logoLightUrl', 'logoLightAlt', 'logoDarkUrl', 'logoDarkAlt', 'defaultTheme']) delete old[field];
  old.businessName = 'My existing business'; old.mission = 'Keep this mission unchanged.'; setMeta('settings', old);
  db.prepare('INSERT INTO users(id,name,email,password_hash,role,active,created_at) VALUES (?,?,?,?,?,?,?)').run(randomUUID(), 'Keep owner', 'owner@example.invalid', 'test-only-not-a-password', 'owner', 1, new Date().toISOString());
  const servicesBefore = getServices().length; closeDatabase(); const restored = getPublicSettings();
  assert.equal(restored.defaultTheme, 'system'); assert.equal(restored.logoLightUrl, ''); assert.equal(restored.businessName, 'My existing business'); assert.equal(restored.mission, 'Keep this mission unchanged.');
  assert.equal(getServices().length, servicesBefore); assert.equal((getDb().prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count, 1);
});
test('both logo references and default appearance validate and persist independently', () => {
  fresh(); const light = registerImage(); const dark = registerImage();
  const result = validateSettings({ logoLightUrl: light, logoLightAlt: 'Light logo', logoDarkUrl: dark, logoDarkAlt: 'Dark logo', defaultTheme: 'light' }, getPublicSettings());
  setMeta('settings', result); closeDatabase(); const read = getPublicSettings();
  assert.equal(read.logoLightUrl, light); assert.equal(read.logoDarkUrl, dark); assert.equal(read.defaultTheme, 'light'); assert.notEqual(light, dark);
});
test('each uploaded theme logo requires descriptive alternative text', () => {
  fresh(); const url = registerImage();
  assert.throws(() => validateSettings({ logoLightUrl: url, logoLightAlt: '' }, defaultSettings), (error: unknown) => error instanceof ApiError && !!error.errors?.logoLightAlt);
  assert.throws(() => validateSettings({ logoDarkUrl: url, logoDarkAlt: '' }, defaultSettings), (error: unknown) => error instanceof ApiError && !!error.errors?.logoDarkAlt);
});
test('appearance settings reject unsupported modes and unsafe or unregistered logos', () => {
  fresh();
  assert.throws(() => validateSettings({ defaultTheme: 'neon' }, defaultSettings), ApiError);
  for (const logoLightUrl of ['javascript:alert(1)', 'https://example.invalid/logo.png', '/media/00000000-0000-4000-8000-000000000000.png']) assert.throws(() => validateSettings({ logoLightUrl, logoLightAlt: 'Logo' }, defaultSettings), ApiError);
});
test('updating one appearance field does not overwrite an existing theme logo', () => {
  fresh(); const dark = registerImage(); const current = validateSettings({ logoDarkUrl: dark, logoDarkAlt: 'Keep this logo' }, defaultSettings);
  const changed = validateSettings({ defaultTheme: 'dark' }, current);
  assert.equal(changed.logoDarkUrl, dark); assert.equal(changed.logoDarkAlt, 'Keep this logo'); assert.equal(changed.contactEmail, current.contactEmail);
});
