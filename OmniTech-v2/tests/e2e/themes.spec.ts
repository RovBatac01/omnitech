import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const origin = 'http://127.0.0.1:3187';
const storageKey = 'omnitech-appearance';
async function choose(page: Page, name: 'Light' | 'Dark' | 'Follow device') {
  const trigger = page.getByRole('button', { name: 'Appearance settings', exact: true });
  if (await trigger.getAttribute('aria-expanded') !== 'true') await trigger.click();
  await page.getByRole('radio', { name: new RegExp(`^${name} `) }).check();
  await page.keyboard.press('Escape');
}
async function login(request: APIRequestContext) {
  const account = JSON.parse(await readFile('qa/e2e/credentials.json', 'utf8'));
  const response = await request.post('/api/admin/login', { headers: { Origin: origin }, data: account });
  expect(response.ok(), await response.text()).toBeTruthy();
  return { Origin: origin, 'x-csrf-token': (await response.json()).csrfToken as string };
}

test('theme preferences persist and follow device; keyboard controls remain usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await choose(page, 'Dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBe('dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/contact');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await choose(page, 'Follow device');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await choose(page, 'Light');
  const trigger = page.getByRole('button', { name: 'Appearance settings', exact: true });
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('radio', { name: /^Light / })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(errors).toEqual([]);
});

test('theme switching still works when browser storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage disabled', 'SecurityError'); } });
  });
  await page.goto('/');
  await choose(page, 'Light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await choose(page, 'Dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('separate transparent logos are saved and selected throughout the website', async ({ page, request }) => {
  const headers = await login(request);
  const before = await (await request.get('/api/admin/settings')).json();
  async function upload(name: string, color: string) {
    const symbol = await sharp({ create: { width: 80, height: 80, channels: 4, background: color } }).png().toBuffer();
    const buffer = await sharp({ create: { width: 120, height: 120, channels: 4, background: '#00000000' } })
      .composite([{ input: symbol, left: 20, top: 20 }]).png().toBuffer();
    const result = await request.post('/api/admin/upload', { headers, multipart: { file: { name, mimeType: 'image/png', buffer } } });
    expect(result.status(), await result.text()).toBe(201);
    const media = await result.json();
    const downloaded = await request.get(media.url);
    const { data, info } = await sharp(await downloaded.body()).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(4);
    expect(data[3], 'Transparent corner survives the upload pipeline').toBe(0);
    return media.url as string;
  }
  try {
    const lightUrl = await upload('light-mode-logo.png', '#006b63');
    const darkUrl = await upload('dark-mode-logo.png', '#e3f7f2');
    const saved = await request.patch('/api/admin/settings', { headers, data: { settings: {
      ...before.settings, logoLightUrl: lightUrl, logoLightAlt: 'Test brand for light mode',
      logoDarkUrl: darkUrl, logoDarkAlt: 'Test brand for dark mode', defaultTheme: 'system',
    } } });
    expect(saved.ok(), await saved.text()).toBeTruthy();
    await page.goto('/');
    for (const [mode, url] of [['Light', lightUrl], ['Dark', darkUrl]] as const) {
      await choose(page, mode);
      const active = page.locator(`.business-brand .theme-logo-${mode.toLowerCase()}:visible`);
      expect(await active.count()).toBeGreaterThanOrEqual(3);
      for (const logo of await active.all()) {
        await expect(logo).toHaveAttribute('src', url);
        await expect(logo).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      }
      await expect(page.locator(`.business-brand .theme-logo-${mode === 'Light' ? 'dark' : 'light'}:visible`)).toHaveCount(0);
    }
    const credentials = JSON.parse(await readFile('qa/e2e/credentials.json', 'utf8'));
    await page.goto('/admin/login');
    await page.getByLabel('Email address', { exact: true }).fill(credentials.email);
    await page.getByLabel('Password', { exact: true }).fill(credentials.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin\/?$/);
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { name: 'One brand. Two appearances.' })).toBeVisible();
    await expect(page.getByLabel('Light mode logo file', { exact: true })).toBeAttached();
    await expect(page.getByLabel('Dark mode logo file', { exact: true })).toBeAttached();
    await expect(page.getByLabel('Light mode logo alternative text', { exact: true })).toHaveValue('Test brand for light mode');
    await expect(page.getByLabel('Dark mode logo alternative text', { exact: true })).toHaveValue('Test brand for dark mode');
    await page.getByLabel('Default website appearance', { exact: true }).selectOption('light');
    await page.getByRole('button', { name: /save (website )?settings/i }).click();
    await expect(page.getByRole('status')).toContainText('Website settings saved');
    const after = await (await request.get('/api/admin/settings')).json();
    expect(after.settings.logoLightUrl).toBe(lightUrl);
    expect(after.settings.logoDarkUrl).toBe(darkUrl);
    expect(after.settings.defaultTheme).toBe('light');
  } finally {
    const restored = await request.patch('/api/admin/settings', { headers, data: { settings: before.settings } });
    expect(restored.ok(), await restored.text()).toBeTruthy();
  }
});

test('both themes have responsive public layouts and accessible appearance controls', async ({ page }) => {
  test.setTimeout(120_000);
  for (const mode of ['Light', 'Dark'] as const) {
    for (const route of ['/', '/services', '/projects', '/contact', '/admin/login']) {
      await page.goto(route);
      await choose(page, mode);
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode.toLowerCase());
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(scan.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), `${mode}: ${route}`).toEqual([]);
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${mode}: ${route}, ${width}px`).toBeTruthy();
      }
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${mode}: ${route}, 200% text`).toBeTruthy();
      await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
  }
});
