import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, lastLogin: u.lastLogin, status: u.status };
}

router.get('/', requireAuth, requireRole('manage_users'), async (req, res) => {
  await db.read();
  res.json(db.data.users.map(publicUser));
});

router.post('/', requireAuth, requireRole('manage_users'), async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, and role are required' });
  }
  if (password.length < 10) {
    return res.status(400).json({ error: 'Password must be at least 10 characters' });
  }
  if (!['admin', 'editor'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  await db.read();
  if (db.data.users.some(u => u.email === email.toLowerCase())) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id: randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    lastLogin: null,
    status: 'active'
  };
  db.data.users.push(user);
  await db.write();
  res.status(201).json(publicUser(user));
});

router.delete('/:id', requireAuth, requireRole('manage_users'), async (req, res) => {
  if (req.params.id === req.session.user.id) {
    return res.status(400).json({ error: 'You cannot remove your own account' });
  }
  await db.read();
  db.data.users = db.data.users.filter(u => u.id !== req.params.id);
  await db.write();
  res.status(204).end();
});

export default router;
