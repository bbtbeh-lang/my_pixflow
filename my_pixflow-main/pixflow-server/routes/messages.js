import { Router } from 'express';
import { randomUUID } from 'crypto';
import rateLimit from 'express-rate-limit';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { notifyNewMessage } from '../notify.js';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,                  // 10 submissions per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' }
});

function esc(v) { return String(v ?? '').trim().slice(0, 5000); }

// PUBLIC — this is what contact.html actually posts to now
router.post('/', contactLimiter, async (req, res) => {
  const { name, email, subject, message, hp } = req.body || {};

  // Honeypot field: real users never fill this hidden input, bots often do
  if (hp) return res.status(200).json({ ok: true });

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) return res.status(400).json({ error: 'Invalid email address' });

  await db.read();
  const savedMessage = {
    id: randomUUID(),
    name: esc(name),
    email: esc(email),
    subject: esc(subject) || '(no subject)',
    message: esc(message),
    date: new Date().toISOString(),
    status: 'new'
  };
  db.data.messages.push(savedMessage);
  await db.write();

  res.status(201).json({ ok: true });

  // Fire-and-forget: don't make the visitor wait on email delivery, and
  // never fail their submission if the email provider has a hiccup.
  notifyNewMessage(savedMessage);
});

// ADMIN — list/read/delete
router.get('/', requireAuth, requireRole('view'), async (req, res) => {
  await db.read();
  res.json(db.data.messages);
});

router.patch('/:id/read', requireAuth, requireRole('edit'), async (req, res) => {
  await db.read();
  const m = db.data.messages.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found' });
  m.status = 'read';
  await db.write();
  res.json(m);
});

router.delete('/:id', requireAuth, requireRole('del_msgs'), async (req, res) => {
  await db.read();
  db.data.messages = db.data.messages.filter(x => x.id !== req.params.id);
  await db.write();
  res.status(204).end();
});

export default router;
