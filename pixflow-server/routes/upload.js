import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { requireAuth, requireRole } from '../middleware/auth.js';

// ─────────────────────────────────────────────────────────────────────────
// Uploads now go to Cloudflare R2 (S3-compatible object storage) instead of
// the local disk. Render's Free tier wipes local files on every restart/
// redeploy/spin-down, so anything saved to disk was never actually safe.
//
// Required env vars (see docs/SUPABASE_SETUP.md for the full setup guide):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
//   R2_BUCKET, R2_PUBLIC_URL
// ─────────────────────────────────────────────────────────────────────────

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL, // e.g. https://pub-xxxxxxxx.r2.dev  (no trailing slash)
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  throw new Error(
    'Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET / R2_PUBLIC_URL. ' +
    'See docs/SUPABASE_SETUP.md for setup instructions.'
  );
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Files are held in memory only long enough to stream to R2 — never written
// to the (ephemeral) local disk.
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
      await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }));
      res.status(201).json({ url: `${R2_PUBLIC_URL}/${key}` });
    } catch (uploadErr) {
      res.status(502).json({ error: `R2 upload failed: ${uploadErr.message}` });
    }
  });
});

export default router;
