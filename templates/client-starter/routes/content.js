import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// PUBLIC — lets the marketing site fetch live copy if/when it's wired to do so
router.get('/', async (req, res) => {
  await db.read();
  res.json(db.data.content || {});
});

router.put('/', requireAuth, requireRole('edit'), async (req, res) => {
  const { section, data } = req.body || {};
  if (!section || typeof data !== 'object') {
    return res.status(400).json({ error: 'section and data are required' });
  }
  await db.read();
  db.data.content = { ...db.data.content, [section]: data };
  await db.write();
  res.json(db.data.content);
});

export default router;
