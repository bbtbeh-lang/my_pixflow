import { Router } from 'express';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// Builds an authenticated CRUD router for a top-level array in db.data[key]
export function makeCollectionRouter(key) {
  const router = Router();

  router.get('/', requireAuth, requireRole('view'), async (req, res) => {
    await db.read();
    res.json(db.data[key]);
  });

  router.post('/', requireAuth, requireRole('edit'), async (req, res) => {
    await db.read();
    const item = { id: randomUUID(), ...req.body };
    db.data[key].push(item);
    await db.write();
    res.status(201).json(item);
  });

  router.put('/:id', requireAuth, requireRole('edit'), async (req, res) => {
    await db.read();
    const idx = db.data[key].findIndex(x => x.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    db.data[key][idx] = { ...db.data[key][idx], ...req.body, id: req.params.id };
    await db.write();
    res.json(db.data[key][idx]);
  });

  router.delete('/:id', requireAuth, requireRole('delete'), async (req, res) => {
    await db.read();
    db.data[key] = db.data[key].filter(x => x.id !== req.params.id);
    await db.write();
    res.status(204).end();
  });

  return router;
}
