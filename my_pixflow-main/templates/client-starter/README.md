# Pixflow Server

Real backend for the Pixflow admin panel: session-based auth (bcrypt-hashed
passwords), persistent storage, and a working contact form. Replaces the old
client-side-only localStorage version.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:
- `SESSION_SECRET` — generate with:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` — your first admin login.
  `ADMIN_PASSWORD` must be at least 10 characters.
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` / `SUPABASE_STORAGE_BUCKET` —
  required for both the database and file uploads. Create a fresh Supabase
  project (free tier) per client — see `../../docs/SUPABASE_SETUP.md`.

**The server auto-seeds on first boot** — the first admin account and 5
starter pages are created automatically from your `.env` values the first
time you run `node server.js`, no separate command needed. This is what
makes it deployable on platforms like Railway/Render with no CLI/SSH access:
just set the environment variables in their dashboard and deploy.

If you prefer to seed manually before starting the server (e.g. local dev),
you can still run:
```bash
node seed.js
```

After the admin account exists, you can remove `ADMIN_PASSWORD` from `.env`
— it's only read on that first boot. Adding more users afterward is done
from the admin panel itself.

## Run

```bash
node server.js
```

The server serves the Pixflow site (from `../pixflow`) and the API together
on the same port (default 3000) — so in production you only deploy one app.

## Folder layout expected

```
pixflow-server/   <- this folder
pixflow/          <- the public site (index.html, admin.html, etc.)
```

Keep them as sibling folders, e.g. both inside one project root.

## Deploying to Railway (no CLI/SSH needed)

1. **New Project → Deploy from GitHub repo** → pick your repo.
2. Since `pixflow` and `pixflow-server` are two folders in one repo, go to
   **Settings → Root Directory** and set it to `pixflow-server`. Railway
   will then run `npm install` and `node server.js` from inside that folder.
3. **Variables tab** → add:
   ```
   SESSION_SECRET=<generate one, see above>
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=<a strong password, 10+ characters>
   ADMIN_NAME=Your Name
   NODE_ENV=production
   SUPABASE_URL=<from your Supabase project>
   SUPABASE_SERVICE_KEY=<from your Supabase project>
   SUPABASE_STORAGE_BUCKET=pixflow-uploads
   ```
   (Don't set `PORT` — Railway injects it automatically.)
4. No Volume needed — the database and uploaded files both live in
   Supabase, not on local disk, so nothing is wiped on redeploy.
5. Deploy. Check the deploy logs for `✓ Admin account created` to confirm
   the auto-seed worked.
6. Visit your Railway-provided URL, then `/admin` to log in.
7. Once you have a working login, you can remove `ADMIN_PASSWORD` from the
   Variables tab if you'd like (optional — it's only read on first boot).

## Deploying elsewhere (Render, a VPS, etc.)

Any Node host works. Checklist:
- Set `NODE_ENV=production` so session cookies require HTTPS.
- Put this behind HTTPS — session cookies won't work correctly over plain HTTP in production mode.
- Set the same `SUPABASE_*` env vars as above — no persistent volume or
  local file backup needed, since all state lives in Supabase.
- On Render's free tier specifically, add a `/health` uptime monitor to
  avoid cold-start delays — see `../../docs/RENDER_COLD_START.md`.
- Never commit `.env` (already in `.gitignore`).

## What's real now vs. still local-only

Real (server-backed): login/logout + password change, services, portfolio,
projects, messages (including the public contact form), user management,
site settings, page SEO metadata, homepage/about/contact editable text
(Content Editor), and testimonials — including a public endpoint that the
homepage uses to render approved reviews dynamically.

Everything in the admin panel is now backed by the real database. Two
honest caveats:
- **Settings → Branding/Typography**: saving these stores the values, but
  the public site's actual CSS is not dynamically generated from them yet.
  Changing "Accent color" here won't re-theme the live site by itself —
  that would need a separate templating pass.
- **Settings → Security toggles** ("require login every visit", "log admin
  actions"): these save as preferences but aren't enforced by any
  session-length logic or audit-log engine yet.
