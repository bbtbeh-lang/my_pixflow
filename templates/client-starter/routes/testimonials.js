import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// PUBLIC — used by the marketing site to render testimonials dynamically.
// Only ever returns published, approved reviews.
router.get('/', async (req, res) => {
  await db.read();
  res.json((db.data.testimonials || []).filter(t => t.status === 'published'));
});

// ADMIN — full list including pending/draft, for the review queue
router.get('/all', requireAuth, requireRole('view'), async (req, res) => {
  await db.read();
  res.json(db.data.testimonials || []);
});

router.post('/', requireAuth, requireRole('edit'), async (req, res) => {
  await db.read();
  const item = { id: randomUUID(), status: 'pending', ...req.body };
  db.data.testimonials.push(item);
  await db.write();
  res.status(201).json(item);
});

router.put('/:id', requireAuth, requireRole('edit'), async (req, res) => {
  await db.read();
  const idx = db.data.testimonials.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db.data.testimonials[idx] = { ...db.data.testimonials[idx], ...req.body, id: req.params.id };
  await db.write();
  res.json(db.data.testimonials[idx]);
});

router.patch('/:id/approve', requireAuth, requireRole('edit'), async (req, res) => {
  await db.read();
  const t = db.data.testimonials.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  t.status = 'published';
  await db.write();
  res.json(t);
});

router.delete('/:id', requireAuth, requireRole('delete'), async (req, res) => {
  await db.read();
  db.data.testimonials = db.data.testimonials.filter(x => x.id !== req.params.id);
  await db.write();
  res.status(204).end();
});

export default router;
