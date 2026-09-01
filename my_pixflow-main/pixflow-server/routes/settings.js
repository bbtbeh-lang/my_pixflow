import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Whitelist of settings fields that are safe to expose publicly.
// Never add anything here that isn't purely cosmetic (no emails, no
// security flags, no notification prefs) — this route has no auth check.
const PUBLIC_FIELDS = [
  'st-color-ink',
  'st-color-accent',
  'st-color-bg',
  'st-color-white',
  'st-font-display',
  'st-font-en',
  'st-font-fa'
];

// Public read — used by the live site to apply branding at runtime.
// Must be declared before the authenticated GET '/' below.
router.get('/public', async (req, res) => {
  await db.read();
  const all = db.data.settings || {};
  const pub = {};
  for (const key of PUBLIC_FIELDS) {
    if (all[key] !== undefined) pub[key] = all[key];
  }
  res.set('Cache-Control', 'public, max-age=60'); // avoid hammering db.read() on every page load
  res.json(pub);
});

router.get('/', requireAuth, requireRole('view'), async (req, res) => {
  await db.read();
  res.json(db.data.settings || {});
});

router.put('/', requireAuth, requireRole('edit'), async (req, res) => {
  await db.read();
  db.data.settings = { ...db.data.settings, ...req.body };
  await db.write();
  res.json(db.data.settings);
});

export default router;
