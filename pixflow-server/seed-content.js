import { db } from './db.js';
import { randomUUID } from 'crypto';

async function seedContent() {
  await db.read();

  if (db.data.pages.length > 0) {
    console.log('Pages already exist — skipped. Delete data/db.json to reseed.');
    return;
  }

  db.data.pages = [
    { id: randomUUID(), title: 'Home', slug: '/', status: 'published', seo: 'Pixflow — Build with clarity.', meta: 'Pixflow creates modern websites.', updated: new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) },
    { id: randomUUID(), title: 'About', slug: '/about', status: 'published', seo: 'About — Pixflow', meta: 'Learn about Pixflow.', updated: new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) },
    { id: randomUUID(), title: 'Services', slug: '/services', status: 'published', seo: 'Services — Pixflow', meta: 'Pixflow web design services.', updated: new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) },
    { id: randomUUID(), title: 'Portfolio', slug: '/portfolio', status: 'published', seo: 'Portfolio — Pixflow', meta: 'Selected Pixflow projects.', updated: new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) },
    { id: randomUUID(), title: 'Contact', slug: '/contact', status: 'published', seo: 'Contact — Pixflow', meta: 'Get in touch with Pixflow.', updated: new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) }
  ];

  await db.write();
  console.log('Seeded 5 pages. Testimonials were left empty on purpose — add only real client reviews from the admin panel.');
}

seedContent();
