import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { db, withDb } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8,                   // 8 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' }
});

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, lastLogin: u.lastLogin, status: u.status };
}

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  await db.read();
  const user = db.data.users.find(u => u.email === String(email).toLowerCase());

  // Always run bcrypt.compare even on missing user, to avoid timing-based
  // user enumeration (compare against a dummy hash if not found).
  const hash = user?.passwordHash || '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvalidsa';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok || user.status !== 'active') {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  user.lastLogin = new Date().toISOString();
  await db.write();

  req.session.user = publicUser(user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

router.put('/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 10) {
    return res.status(400).json({ error: 'New password must be at least 10 characters' });
  }

  await db.read();
  const user = db.data.users.find(u => u.id === req.session.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await db.write();
  res.json({ ok: true });
});

export default router;
