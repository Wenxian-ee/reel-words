// Cloud sync (local-first).
//
// IndexedDB stays the source of truth for the UI. When signed in, local changes
// are queued in `pending` and pushed to Supabase; remote changes are pulled
// incrementally using a server-side timestamp cursor. Conflicts are resolved
// per entry by last-write-wins on the client `updatedAt` timestamp.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';
const PENDING_KEY = 'reel-words:sync:pending';
const CURSOR_KEY = uid => `reel-words:sync:cursor:${uid}`;
const PAGE = 1000;

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const enabled = !!(SUPABASE_URL && SUPABASE_KEY);

let sb = null;
let user = null;
let hooks = null;
let status = enabled ? 'signed-out' : 'off'; // off | loading | signed-out | syncing | synced | offline | error
let lastError = '';
let lastSyncedAt = 0;
let timer = null;
let running = null;
let again = false;

// pending: { [id]: { del: boolean, at: number, v: number } }
let pending = store.get(PENDING_KEY, {});
let seq = Object.values(pending).reduce((m, p) => Math.max(m, p.v || 0), 0);
const savePending = () => store.set(PENDING_KEY, pending);

/* ---------- public state ---------- */
export const getUser = () => user;
export const getStatus = () => ({ status, lastError, lastSyncedAt, pending: Object.keys(pending).length, email: user?.email || '' });

function setStatus(s, err = '') {
  status = s;
  lastError = err;
  hooks?.onStatus?.(getStatus());
}

/* ---------- change tracking (called by the app on every local write) ---------- */
export function trackPut(ids) {
  for (const id of ids) pending[id] = { del: false, at: 0, v: ++seq };
  savePending();
  schedule();
}
export function trackDelete(ids, at = Date.now()) {
  for (const id of ids) pending[id] = { del: true, at, v: ++seq };
  savePending();
  schedule();
}

/* ---------- lifecycle ---------- */
export async function init(h) {
  hooks = h;
  if (!enabled) return;
  setStatus('loading');
  try {
    const { createClient } = await import(LIB);
    sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'reel-words:auth' },
    });
  } catch {
    setStatus('offline', 'Could not load the sync library');
    return;
  }

  // Report an expired / invalid sign-in link, then tidy the URL.
  const params = new URLSearchParams(location.search);
  const linkError = params.get('error_description');

  const { data } = await sb.auth.getSession();
  user = data.session?.user || null;

  if (params.has('code') || params.has('error') || params.has('error_description')) {
    history.replaceState(null, '', location.pathname + location.hash);
  }
  if (linkError) hooks.onMessage?.(`Sign-in failed: ${linkError}`);

  sb.auth.onAuthStateChange((event, session) => {
    const prev = user?.id;
    user = session?.user || null;
    if (user && user.id !== prev) {
      hooks.onMessage?.(`Signed in as ${user.email}`);
      schedule(0);
    }
    if (!user) setStatus('signed-out');
    else hooks?.onStatus?.(getStatus());
  });

  window.addEventListener('online', () => schedule(0));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(0); });

  if (user) { setStatus('syncing'); schedule(0); }
  else setStatus('signed-out');
}

export function schedule(ms = 1500) {
  if (!sb || !user) return;
  clearTimeout(timer);
  timer = setTimeout(() => { syncNow(); }, ms);
}

export function syncNow() {
  if (!sb || !user) return Promise.resolve();
  if (running) { again = true; return running; }
  running = (async () => {
    try {
      setStatus('syncing');
      await pull();
      await push();
      lastSyncedAt = Date.now();
      setStatus('synced');
    } catch (e) {
      console.warn('[sync]', e);
      setStatus(navigator.onLine ? 'error' : 'offline', e?.message || String(e));
    } finally {
      running = null;
      if (again) { again = false; schedule(500); }
    }
  })();
  return running;
}

/* ---------- pull ---------- */
async function pull() {
  const uid = user.id;
  let cursor = store.get(CURSOR_KEY(uid), null);

  // First sync of this account on this device: upload everything already here.
  if (!cursor) {
    for (const id of hooks.allIds()) if (!pending[id]) pending[id] = { del: false, at: 0, v: ++seq };
    savePending();
  }

  // Small overlap guards against rows committed slightly out of order.
  const since = cursor ? new Date(new Date(cursor).getTime() - 30_000).toISOString() : '1970-01-01T00:00:00Z';
  const puts = [];
  const dels = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from('entries')
      .select('id,data,updated_at,deleted,server_updated_at')
      .gt('server_updated_at', since)
      .order('server_updated_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;

    for (const row of data) {
      if (!cursor || row.server_updated_at > cursor) cursor = row.server_updated_at;
      const local = hooks.get(row.id);
      const p = pending[row.id];
      const localTs = p ? (p.del ? p.at : (local?.updatedAt ?? 0)) : (local?.updatedAt ?? -1);

      if (row.updated_at > localTs || (!p && row.updated_at === localTs)) {
        // Remote wins
        if (p) delete pending[row.id];
        if (row.deleted) { if (local) dels.push(row.id); }
        else if (!local || local.updatedAt !== row.updated_at) puts.push(row.data);
      } else if (!p) {
        // Local is newer but somehow not queued — queue it.
        if (local) pending[row.id] = { del: false, at: 0, v: ++seq };
      }
    }
    if (data.length < PAGE) break;
  }

  savePending();
  if (puts.length || dels.length) await hooks.applyRemote(puts, dels);
  if (cursor) store.set(CURSOR_KEY(uid), cursor);
}

/* ---------- push ---------- */
async function push() {
  const snapshot = { ...pending };
  const rows = [];
  for (const [id, p] of Object.entries(snapshot)) {
    if (p.del) rows.push({ user_id: user.id, id, data: {}, updated_at: p.at, deleted: true });
    else {
      const e = hooks.get(id);
      if (!e) { delete pending[id]; continue; }
      rows.push({ user_id: user.id, id, data: e, updated_at: e.updatedAt, deleted: false });
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await sb.from('entries').upsert(chunk, { onConflict: 'user_id,id' });
    if (error) throw error;
    // Only clear items that weren't changed again while we were uploading.
    for (const r of chunk) if (pending[r.id] && pending[r.id].v === snapshot[r.id].v) delete pending[r.id];
    savePending();
  }
}

/* ---------- auth actions ---------- */
export async function sendLink(email) {
  if (!sb) throw new Error('Sync is not available right now');
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true },
  });
  if (error) throw error;
}

function resetLocalSyncState(uid) {
  pending = {};
  savePending();
  if (uid) store.del(CURSOR_KEY(uid));
  lastSyncedAt = 0;
}

/** Sign out. Syncs first; returns { ok:false, unsynced } if changes would be lost (unless force). */
export async function signOut({ force = false } = {}) {
  if (!sb || !user) return { ok: true };
  await syncNow();
  const unsynced = Object.keys(pending).length;
  if (unsynced && !force) return { ok: false, unsynced };
  const uid = user.id;
  await sb.auth.signOut({ scope: 'local' });
  resetLocalSyncState(uid);
  user = null;
  await hooks.clearLocal();
  setStatus('signed-out');
  return { ok: true };
}

export async function deleteAccount() {
  if (!sb || !user) return;
  const { error } = await sb.rpc('delete_my_account');
  if (error) throw error;
  const uid = user.id;
  await sb.auth.signOut({ scope: 'local' });
  resetLocalSyncState(uid);
  user = null;
  await hooks.clearLocal();
  setStatus('signed-out');
}
