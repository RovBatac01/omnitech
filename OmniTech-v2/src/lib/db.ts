import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { services, projects } from './content';
import type { SiteSettings, CmsService, CmsProject } from '@/types/cms';

export const databasePath = () => resolve(process.env.SQLITE_PATH || 'data/omnitech.sqlite');
export const uploadDirectory = () => resolve(process.env.UPLOAD_DIR || 'data/uploads');
const databases = new Map<string, DatabaseSync>();
export const nowIso = () => new Date().toISOString();
export const newId = () => randomUUID();
export const defaultSettings: SiteSettings = {
  businessName: 'OMNITECH IT SOLUTIONS AND DIGITAL SERVICES', tagline: 'Technology that connects possibilities.',
  logoUrl: '', logoAlt: '', logoLightUrl: '', logoLightAlt: '', logoDarkUrl: '', logoDarkAlt: '', defaultTheme: 'system', contactEmail: 'rovicbatacandolo@gmail.com', phone: '0994 614 3291', address: '',
  heroEyebrow: 'CONNECTED THINKING. LIMITLESS POSSIBILITIES.', heroTitle: 'Innovative IT Solutions', heroAccent: 'for a Digital Future.',
  heroDescription: 'Empowering businesses with reliable IT infrastructure, thoughtful digital solutions, and technology built around your next step.',
  aboutTitle: 'Technology that powers progress.', aboutDescription: 'From the infrastructure behind your operations to the digital experiences your customers see, OMNITECH connects the dots. We bring a thoughtful, practical approach to IT solutions and digital services, built around your people, your business, and your next step.',
  mission: 'To help organizations work smarter through dependable IT solutions, practical innovation, and digital services shaped around their people and goals.',
  vision: 'To be a trusted technology and digital services partner, connecting people and businesses to meaningful opportunities for growth.',
  ctaTitle: 'Let’s build your next possibility.', ctaDescription: 'Tell us about your goals. We’ll help shape a clear, practical next step.',
  socialLinks: [], analyticsEnabled: true, accessibilityEmail: 'rovicbatacandolo@gmail.com', inquiryRetentionDays: 365,
};

export function getDb(): DatabaseSync {
  const path = databasePath(); const existing = databases.get(path); if (existing) return existing;
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','admin')),
      active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('services','projects','announcements')),
      slug TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','published')),
      sort_order INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(kind,slug)
    );
    CREATE INDEX IF NOT EXISTS content_published ON content(kind,status,sort_order);
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY, submission_id TEXT NOT NULL UNIQUE, reference TEXT NOT NULL UNIQUE,
      payload_hash TEXT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
      company TEXT NOT NULL, service TEXT NOT NULL, subject TEXT NOT NULL, message TEXT NOT NULL,
      preferred_contact_method TEXT NOT NULL, consent_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new', notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS inquiries_created ON inquiries(created_at DESC);
    CREATE INDEX IF NOT EXISTS inquiries_status ON inquiries(status);
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY, inquiry_id TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
      recipient TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT NOT NULL DEFAULT '', next_attempt_at INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0, lease_token TEXT NOT NULL DEFAULT '', sent_at TEXT,
      created_at TEXT NOT NULL, UNIQUE(inquiry_id,recipient)
    );
    CREATE INDEX IF NOT EXISTS outbox_due ON outbox(status,next_attempt_at,locked_until);
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY, session_hash TEXT NOT NULL, path TEXT NOT NULL,
      event TEXT NOT NULL CHECK(event IN ('page_view','cta_click')), label TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS events_created ON events(created_at);
    CREATE INDEX IF NOT EXISTS events_sessions ON events(session_hash,created_at);
    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS uploads (name TEXT PRIMARY KEY, mime TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL);
  `);
  databases.set(path, db);
  try { chmodSync(path, 0o600); } catch { /* Windows controls access through directory permissions. */ }
  if (!db.prepare("SELECT 1 FROM meta WHERE key='initialized'").get()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      // Re-check under the write lock for concurrent first startup.
      if (!db.prepare("SELECT 1 FROM meta WHERE key='initialized'").get()) {
        const meta = db.prepare('INSERT OR IGNORE INTO meta(key,value) VALUES (?,?)');
        meta.run('settings', JSON.stringify(defaultSettings)); meta.run('recipients', JSON.stringify(['rovicbatacandolo@gmail.com']));
        meta.run('privacy_salt', randomBytes(32).toString('hex'));
        const insert = db.prepare('INSERT INTO content(id,kind,slug,status,sort_order,data,updated_at) VALUES (?,?,?,?,?,?,?)');
        services.forEach((service, i) => {
          const item: CmsService = { ...service, details: [...service.details], id: newId(), featured: !!service.featured, status: 'published', sortOrder: i, updatedAt: nowIso() };
          insert.run(item.id, 'services', item.slug, item.status, i, JSON.stringify(item), item.updatedAt);
        });
        projects.forEach((project, i) => {
          const item: CmsProject = { id: newId(), slug: project.slug, title: project.title, description: project.description,
            serviceSlugs: [['network-infrastructure'], ['queuing-system','software-development'], ['web-development']][i],
            stack: [...project.stack], creativeTypes: [], projectType: 'concept', imageUrl: '', imageAlt: '', visualType: project.type,
            opportunity: project.challenge, approach: project.approach, demonstration: project.result, client: '', completedAt: '',
            featured: true, status: 'published', videoUrl: '', captionsUrl: '', transcript: '', sortOrder: i, updatedAt: nowIso() };
          insert.run(item.id,'projects',item.slug,item.status,i,JSON.stringify(item),item.updatedAt);
        });
        meta.run('schema_version', '1'); meta.run('initialized', nowIso());
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); databases.delete(path); db.close(); throw error; }
  }
  return db;
}
export function transaction<T>(work: (db: DatabaseSync) => T): T {
  const db = getDb(); db.exec('BEGIN IMMEDIATE');
  try { const result = work(db); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function getMeta<T>(key: string): T {
  const row = getDb().prepare('SELECT value FROM meta WHERE key=?').get(key) as {value:string}|undefined;
  if (!row) throw new Error(`Missing configuration: ${key}`); return JSON.parse(row.value) as T;
}
export function setMeta(key: string, value: unknown) { getDb().prepare('INSERT INTO meta(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value)); }
export function audit(actor: string, action: string, detail: string) {
  getDb().prepare('INSERT INTO audit_log(id,actor,action,detail,created_at) VALUES (?,?,?,?,?)').run(newId(), actor, action, detail.slice(0,500), nowIso());
}
export function closeDatabase() { for (const db of databases.values()) db.close(); databases.clear(); }
