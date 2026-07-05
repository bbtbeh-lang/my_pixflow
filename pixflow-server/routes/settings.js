import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

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
