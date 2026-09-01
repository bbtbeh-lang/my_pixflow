import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────
// Supabase-backed persistence layer.
//
// This is a DROP-IN REPLACEMENT for the old lowdb (local-file) db.js.
// Every route in this project only ever calls db.read(), db.write(), and
// reads/mutates db.data — so nothing else in the codebase needs to change.
//
// Instead of a relational schema, the entire app state is stored as ONE
// JSONB row (id='main') in a single Postgres table. This keeps the exact
// same document-shaped data model the app was built around, while giving
// it real, persistent storage that survives Render restarts/redeploys/
// spin-downs (unlike the local filesystem on Render's Free tier).
//
// Required setup (see docs/SUPABASE_SETUP.md):
//   1. Create a Supabase project (free tier).
//   2. Run the SQL in docs/SUPABASE_SETUP.md to create the `pixflow_state` table.
//   3. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your environment (.env
//      locally, and in Render's Environment settings for production).
// ─────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables. ' +
    'See docs/SUPABASE_SETUP.md for setup instructions.'
  );
}

// service_role key is required (not the public anon key) because this client
// runs server-side only and needs write access without Row Level Security
// getting in the way. NEVER expose this key to the browser/frontend.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const STATE_ROW_ID = 'main';

const defaultData = {
  users: [],       // { id, name, email, passwordHash, role, lastLogin, status }
  services: [],
  portfolio: [],
  projects: [],
  messages: [],     // contact + order form submissions land here
  pages: [],        // per-page SEO/publish metadata
  testimonials: [], // client reviews (status: 'pending' | 'published')
  settings: {},     // site-wide settings (general/seo/social/branding/security prefs)
  content: {}       // editable homepage/about/contact text blocks
};

async function fetchRemoteState() {
  const { data, error } = await supabase
    .from('pixflow_state')
    .select('data')
    .eq('id', STATE_ROW_ID)
    .maybeSingle();

  if (error) throw new Error(`Supabase read failed: ${error.message}`);

  if (!data) {
    // First run — seed the row with default data.
    const { error: insertError } = await supabase
      .from('pixflow_state')
      .insert({ id: STATE_ROW_ID, data: defaultData });
    if (insertError) throw new Error(`Supabase seed insert failed: ${insertError.message}`);
    return structuredClone(defaultData);
  }

  // Merge with defaultData so any new keys added in future app versions
  // (e.g. a new collection) always exist, even for older stored rows.
  return { ...structuredClone(defaultData), ...data.data };
}

async function pushRemoteState(state) {
  const { error } = await supabase
    .from('pixflow_state')
    .update({ data: state, updated_at: new Date().toISOString() })
    .eq('id', STATE_ROW_ID);
  if (error) throw new Error(`Supabase write failed: ${error.message}`);
}

class SupabaseDb {
  constructor() {
    this.data = null;
  }

  // Pulls the latest state from Supabase into this.data (in place, same
  // reference semantics as lowdb's db.data so existing route code keeps
  // working unmodified: `db.data.services.push(...)` etc.
  async read() {
    const fresh = await fetchRemoteState();
    if (this.data) {
      Object.keys(this.data).forEach((k) => delete this.data[k]);
      Object.assign(this.data, fresh);
    } else {
      this.data = fresh;
    }
  }

  async write() {
    await pushRemoteState(this.data);
  }
}

export const db = new SupabaseDb();
await db.read();

export async function withDb(fn) {
  await db.read();
  const result = await fn(db.data);
  await db.write();
  return result;
}
