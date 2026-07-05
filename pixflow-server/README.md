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

Create the first admin account (hashes the password, never stores it in plain text):

```bash
node seed.js
```

After it runs once, you can delete `ADMIN_PASSWORD` from `.env` — it's only
needed for that one-time step. Adding more users (admin or editor) afterward
is done from the admin panel itself.

Then seed starter page metadata (safe structural content, no fake reviews):

```bash
node seed-content.js
```

Testimonials are intentionally left empty — add only real client reviews
from the admin panel's Testimonials tab.

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

## Deploying

Any Node host works (Railway, Render, a small VPS with pm2, etc.). Checklist:
- Set `NODE_ENV=production` so session cookies require HTTPS.
- Put this behind HTTPS — session cookies won't work correctly over plain HTTP in production mode.
- Back up `data/db.json` regularly — it's the entire database.
- Never commit `.env` or `data/db.json` (already in `.gitignore`).

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
