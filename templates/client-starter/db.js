import { JSONFilePreset } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'data', 'db.json');

const defaultData = {
  users: [],       // { id, name, email, passwordHash, role, lastLogin, status }
  services: [],
  portfolio: [],
  projects: [],
  messages: [],     // contact form submissions land here
  pages: [],        // per-page SEO/publish metadata
  testimonials: [], // client reviews (status: 'pending' | 'published')
  settings: {},     // site-wide settings (general/seo/social/branding/security prefs)
  content: {}       // editable homepage/about/contact text blocks
};

export const db = await JSONFilePreset(DB_FILE, defaultData);

export async function withDb(fn) {
  await db.read();
  const result = await fn(db.data);
  await db.write();
  return result;
}
