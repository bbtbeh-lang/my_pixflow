import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import settingsRoutes from './routes/settings.js';
import contentRoutes from './routes/content.js';
import testimonialsRoutes from './routes/testimonials.js';
import { makeCollectionRouter } from './routes/collection.js';
import { ensureAdminSeeded, ensurePagesSeeded } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is not set in .env — refusing to start.');
  process.exit(1);
}

app.set('trust proxy', 1); // needed if deployed behind a reverse proxy (nginx, etc.)
app.use(express.json());

app.use(session({
  name: 'pixflow.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // requires HTTPS in production
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

// ── API routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/services', makeCollectionRouter('services'));
app.use('/api/portfolio', makeCollectionRouter('portfolio'));
app.use('/api/projects', makeCollectionRouter('projects'));
app.use('/api/pages', makeCollectionRouter('pages'));
app.use('/api/settings', settingsRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/testimonials', testimonialsRoutes);

// ── Static site (public html files, nested inside this folder) ────
// `extensions: ['html']` lets clean URLs like /about resolve to about.html —
// every internal nav link on the site uses this clean-URL format.
const PUBLIC_DIR = path.join(__dirname, 'pixflow');
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// admin.html must never be indexed by search engines
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send('User-agent: *\nDisallow: /admin.html\n');
});

// Seed BEFORE accepting any connections — doing this inside listen()'s
// callback is too late, since Express already accepts requests as soon as
// listen() is called, which can race with these writes and corrupt data.js.
const adminResult = await ensureAdminSeeded();
if (adminResult.seeded) console.log(`✓ Admin account created: ${adminResult.email}`);
else console.log(`Admin seed skipped: ${adminResult.reason}`);

const pagesResult = await ensurePagesSeeded();
if (pagesResult.seeded) console.log('✓ Starter pages seeded.');

app.listen(process.env.PORT || 3000, () => {
  console.log(`Pixflow server running on port ${process.env.PORT || 3000}`);
});
