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

## Data storage

As of the Supabase migration, this app **no longer stores anything on
local disk** — the old `data/db.json` (lowdb) and local `data/uploads/`
folder are gone. All state (users, services, portfolio, messages, etc.)
lives in a single Supabase Postgres row, and all uploaded images live in
Supabase Storage — one provider for both, no separate object-storage
account needed. It's a real, persistent, free-tier service that survives
redeploys, restarts, and free-tier spin-downs — unlike a host's local
filesystem.

**Before running the server anywhere (local or deployed), you must set:**
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_STORAGE_BUCKET`.

Full setup steps (creating the Supabase table, creating the Storage
bucket, generating the keys) are in `../docs/SUPABASE_SETUP.md`.

## Deploying to Railway / Render / a VPS

No Volume or persistent disk is required anymore (see "Data storage" above) —
any of these hosts works the same way now:
1. Deploy from your GitHub repo, root directory `pixflow-server`.
2. Set the environment variables listed in "Data storage" above, plus:
   ```
   SESSION_SECRET=<generate one, see above>
   ADMIN_EMAIL=you@example.com
   ADMIN_PASSWORD=<a strong password, 10+ characters>
   ADMIN_NAME=Your Name
   NODE_ENV=production
   ```
3. Put the site behind HTTPS — session cookies won't work correctly over
   plain HTTP in production mode.
4. On Render's Free tier specifically, the service still spins down after
   ~15 minutes idle (a cold start, not data loss anymore). Ping `/health`
   every 10–14 minutes with a free uptime monitor (UptimeRobot,
   cron-job.org) if you want to avoid that delay.

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
