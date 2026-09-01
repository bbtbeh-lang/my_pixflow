import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getChatReply, isChatConfigured } from '../chat.js';

const router = Router();

// Free-tier Gemini quota is generous but finite — keep a per-IP limit so
// one visitor (or a bot) can't burn through the whole day's quota.
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // 20 messages per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages. Please slow down and try again shortly.' }
});

const FALLBACK_REPLY_EN =
  "Sorry, I'm temporarily unavailable. Please use the Contact form and a real person will get back to you.";
const FALLBACK_REPLY_FA =
  'متأسفم، موقتاً در دسترس نیستم. لطفاً از فرم تماس استفاده کنید تا یکی از اعضای تیم پاسخ بده.';

router.get('/status', (req, res) => {
  res.json({ configured: isChatConfigured() });
});

// PUBLIC — no auth, this is what the chat widget posts to on every page.
router.post('/message', chatLimiter, async (req, res) => {
  const { message, history, lang } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message is too long' });
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter((h) => h && typeof h.text === 'string')
        .map((h) => ({ role: h.role, text: h.text.slice(0, 2000) }))
        .slice(-10)
    : [];

  try {
    const reply = await getChatReply(safeHistory, message.trim());
    res.json({ reply });
  } catch (err) {
    console.error('Chat reply failed:', err.message);
    // Never surface a raw error to the visitor — degrade to a friendly
    // fallback so the widget never looks broken.
    res.json({ reply: lang === 'fa' ? FALLBACK_REPLY_FA : FALLBACK_REPLY_EN, degraded: true });
  }
});

export default router;
