import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from './db.js';

export async function ensureAdminSeeded() {
  await db.read();

  if (db.data.users.length > 0) {
    return { seeded: false, reason: 'Users already exist' };
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    return { seeded: false, reason: 'ADMIN_EMAIL / ADMIN_PASSWORD not set' };
  }
  if (password.length < 10) {
    return { seeded: false, reason: 'ADMIN_PASSWORD must be at least 10 characters' };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  db.data.users.push({
    id: randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'admin',
    lastLogin: null,
    status: 'active'
  });

  await db.write();
  return { seeded: true, email };
}

export async function ensurePagesSeeded() {
  await db.read();
  if (db.data.pages.length > 0) return { seeded: false };

  const today = new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  db.data.pages = [
    { id: randomUUID(), title: 'Home', slug: '/', status: 'published', seo: 'Pixflow — Build with clarity.', meta: 'Pixflow creates modern websites.', updated: today },
    { id: randomUUID(), title: 'About', slug: '/about', status: 'published', seo: 'About — Pixflow', meta: 'Learn about Pixflow.', updated: today },
    { id: randomUUID(), title: 'Services', slug: '/services', status: 'published', seo: 'Services — Pixflow', meta: 'Pixflow web design services.', updated: today },
    { id: randomUUID(), title: 'Portfolio', slug: '/portfolio', status: 'published', seo: 'Portfolio — Pixflow', meta: 'Selected Pixflow projects.', updated: today },
    { id: randomUUID(), title: 'Contact', slug: '/contact', status: 'published', seo: 'Contact — Pixflow', meta: 'Get in touch with Pixflow.', updated: today }
  ];
  await db.write();
  return { seeded: true };
}

// Still runnable directly for local/manual use: `node seed.js`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const { config } = await import('dotenv');
  config();
  const r1 = await ensureAdminSeeded();
  console.log(r1.seeded ? `Admin user created: ${r1.email}` : `Skipped: ${r1.reason}`);
  const r2 = await ensurePagesSeeded();
  console.log(r2.seeded ? 'Seeded 5 pages.' : 'Pages already exist — skipped.');
}
