import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '../middleware/auth.js';

// ─────────────────────────────────────────────────────────────────────────
// Uploads go to Supabase Storage instead of the local disk. Render's Free
// tier wipes local files on every restart/redeploy/spin-down, so anything
// saved to disk was never actually safe.
//
// Uses the same Supabase project as db.js — no separate storage provider
// needed. Required env vars (see docs/SUPABASE_SETUP.md):
//   SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_STORAGE_BUCKET
// ─────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'pixflow-uploads';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables. ' +
    'See docs/SUPABASE_SETUP.md for setup instructions.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Files are held in memory only long enough to stream to Supabase Storage —
// never written to the (ephemeral) local disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'));
    }
    cb(null, true);
  }
});

const router = Router();

router.post('/', requireAuth, requireRole('edit'), (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const key = `${randomUUID()}${ext}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(key, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(key);
      res.status(201).json({ url: publicUrlData.publicUrl });
    } catch (uploadErr) {
      res.status(502).json({ error: `Supabase Storage upload failed: ${uploadErr.message}` });
    }
  });
});

export default router;
