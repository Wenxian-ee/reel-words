import { db } from './db.js';
import { newSrs, grade, previewInterval, statusOf, isDue, DAY } from './srs.js';
import * as sync from './sync.js';

/* =====================================================================
   Helpers
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const trunc = (s, n = 24) => (s.length > n ? s.slice(0, n) + '…' : s);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

const TYPES = {
  word: { label: 'Word' },
  phrase: { label: 'Phrase' },
  sentence: { label: 'Sentence' },
};
const STATUS = { new: 'New', learning: 'Learning', mastered: 'Mastered' };

const ICONS = {
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  film: '<rect x="2" y="2" width="20" height="20" rx="2.2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  volume: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  rotate: '<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

function detectType(text) {
  const t = text.trim();
  if (!t) return 'word';
  const words = t.split(/\s+/).length;
  if (words === 1) return 'word';
  // Ends with punctuation, or capitalised and fairly long, or very long → sentence. Otherwise a phrase.
  if (/[.?!…]["'”’)]?$/.test(t) || (/^[A-Z]/.test(t) && words >= 4) || words > 10) return 'sentence';
  return 'phrase';
}

function startOfDay(ts = Date.now()) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function fmtDate(ts, withYear) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
}
function relTime(ts) {
  const diff = Date.now() - ts;
  const m = 60000, h = 3600000;
  if (diff < m) return 'just now';
  if (diff < h) return Math.floor(diff / m) + 'm ago';
  if (ts >= startOfDay()) return Math.floor(diff / h) + 'h ago';
  if (ts >= startOfDay() - DAY) return 'yesterday';
  if (diff < 7 * DAY) return Math.ceil((startOfDay() - ts) / DAY) + ' days ago';
  return fmtDate(ts, new Date(ts).getFullYear() !== new Date().getFullYear());
}

function hue(str) { let h = 0; for (const ch of str) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h % 360; }
function initialOf(name) {
  const s = name.replace(/^(the|a|an)\s+/i, '').trim();
  return esc([...s][0]?.toUpperCase() || '?');
}

/* =====================================================================
   State & settings
   ===================================================================== */
const SETTINGS_KEY = 'reel-words:settings';
const settings = Object.assign(
  { theme: 'system', rate: 0.95, voice: '', lastMovie: '', keepAdding: false },
  (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; } })()
);
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } }
function applyTheme() {
  const root = document.documentElement;
  if (settings.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);
}

const defaultFilters = () => ({ q: '', type: 'all', movie: '', tag: '', status: 'all', sort: 'newest' });
const state = {
  entries: [],
  filters: defaultFilters(),
  review: null,
  reviewPrefs: { scope: '', dir: 'forward' },
  route: 'library',
};

const findEntry = id => state.entries.find(e => e.id === id);

function movieList() {
  const map = new Map();
  for (const e of state.entries) {
    if (!e.movie) continue;
    const m = map.get(e.movie) || { name: e.movie, count: 0, word: 0, phrase: 0, sentence: 0, last: 0, due: 0 };
    m.count++; m[e.type]++; m.last = Math.max(m.last, e.createdAt);
    if (isDue(e.srs)) m.due++;
    map.set(e.movie, m);
  }
  return [...map.values()].sort((a, b) => b.last - a.last);
}
function tagList() {
  const map = new Map();
  for (const e of state.entries) for (const t of e.tags || []) map.set(t, (map.get(t) || 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
const dueList = () => state.entries.filter(e => isDue(e.srs));

function streak() {
  const days = new Set(state.entries.map(e => dayKey(e.createdAt)));
  const d = new Date(); d.setHours(12, 0, 0, 0);
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1); // nothing yet today doesn't break the streak
  let n = 0;
  while (days.has(dayKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* Normalise one entry (used for create, import and sample data) */
function normalize(raw, now = Date.now()) {
  const text = String(raw.text ?? '').trim();
  if (!text) return null;
  const tags = Array.isArray(raw.tags) ? raw.tags : String(raw.tags ?? '').split(/[,，、]/);
  return {
    id: raw.id || uid(),
    text,
    type: TYPES[raw.type] ? raw.type : detectType(text),
    meaning: String(raw.meaning ?? '').trim(),
    phonetic: String(raw.phonetic ?? '').trim(),
    movie: String(raw.movie ?? '').trim(),
    time: String(raw.time ?? '').trim(),
    context: String(raw.context ?? '').trim(),
    notes: String(raw.notes ?? '').trim(),
    tags: [...new Set(tags.map(t => String(t).trim().replace(/^#/, '')).filter(Boolean))],
    starred: !!raw.starred,
    createdAt: Number(raw.createdAt) || now,
    updatedAt: Number(raw.updatedAt) || Number(raw.createdAt) || now,
    srs: raw.srs && typeof raw.srs.due === 'number' ? raw.srs : newSrs(Number(raw.createdAt) || now),
  };
}

/* =====================================================================
   Speech
   ===================================================================== */
function englishVoices() {
  if (!('speechSynthesis' in window)) return [];
  return speechSynthesis.getVoices().filter(v => /^en(-|_|$)/i.test(v.lang));
}
function speak(text) {
  if (!('speechSynthesis' in window)) return toast('Speech is not supported in this browser');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = englishVoices();
  const v = voices.find(x => x.voiceURI === settings.voice) || voices.find(x => x.lang === 'en-US') || voices[0];
  if (v) u.voice = v;
  u.lang = v?.lang || 'en-US';
  u.rate = settings.rate;
  speechSynthesis.speak(u);
}

/* =====================================================================
   Toast & modal
   ===================================================================== */
let toastTimer;
function toast(msg, opts = {}) {
  const root = $('#toast-root');
  root.innerHTML = '';
  clearTimeout(toastTimer);
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${opts.action ? `<button type="button">${esc(opts.action)}</button>` : ''}`;
  root.appendChild(el);
  const hide = () => { el.classList.add('out'); setTimeout(() => el.remove(), 200); };
  if (opts.action) el.querySelector('button').onclick = () => { hide(); opts.onAction?.(); };
  toastTimer = setTimeout(hide, opts.action ? 6000 : 2600);
}

let modalCleanup = null;
const modalOpen = () => !!$('#modal-root').firstElementChild;
function openModal(html, { size = '', onClose } = {}) {
  closeModal();
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay"><div class="modal ${size}" role="dialog" aria-modal="true">${html}</div></div>`;
  const overlay = root.firstElementChild;
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeModal(); });
  overlay.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  modalCleanup = onClose || null;
  document.body.style.overflow = 'hidden';
  return overlay.firstElementChild;
}
function closeModal() {
  const root = $('#modal-root');
  if (!root.firstElementChild) return;
  root.innerHTML = '';
  document.body.style.overflow = '';
  const fn = modalCleanup; modalCleanup = null; fn?.();
}
const closeBtn = `<button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button>`;

function confirmDialog({ title, body, ok = 'OK', danger = false }) {
  return new Promise(resolve => {
    let result = false;
    const m = openModal(`
      <div class="modal-head"><h2>${esc(title)}</h2>${closeBtn}</div>
      <div class="modal-body"><p>${body}</p></div>
      <div class="modal-foot"><span class="left"></span>
        <button class="btn" data-close>Cancel</button>
        <button class="btn ${danger ? 'danger solid' : 'primary'}" data-ok>${esc(ok)}</button>
      </div>`, { size: 'sm', onClose: () => resolve(result) });
    const okBtn = $('[data-ok]', m);
    okBtn.onclick = () => { result = true; closeModal(); };
    okBtn.focus();
  });
}

function promptDialog({ title, label, value = '', ok = 'Save' }) {
  return new Promise(resolve => {
    let result = null;
    const m = openModal(`
      <form>
        <div class="modal-head"><h2>${esc(title)}</h2>${closeBtn}</div>
        <div class="modal-body"><div class="field"><label>${esc(label)}</label><input class="input" name="v" value="${esc(value)}" required></div></div>
        <div class="modal-foot"><span class="left"></span><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">${esc(ok)}</button></div>
      </form>`, { size: 'sm', onClose: () => resolve(result) });
    const form = $('form', m);
    form.onsubmit = e => { e.preventDefault(); result = form.v.value.trim(); closeModal(); };
    form.v.focus(); form.v.select();
  });
}

/* =====================================================================
   Data mutations
   ===================================================================== */
async function upsert(entry) {
  entry = { ...entry, updatedAt: Date.now() };
  await db.put(entry);
  const i = state.entries.findIndex(e => e.id === entry.id);
  if (i >= 0) state.entries[i] = entry; else state.entries.push(entry);
  sync.trackPut([entry.id]);
}

/* Apply changes that came from another device */
async function applyRemote(puts, dels) {
  const list = puts.map(p => normalize(p)).filter(Boolean);
  if (list.length) await db.putMany(list);
  if (dels.length) await db.removeMany(dels);
  const byId = new Map(state.entries.map(e => [e.id, e]));
  list.forEach(e => byId.set(e.id, e));
  dels.forEach(id => byId.delete(id));
  state.entries = [...byId.values()];
  // Re-render without stealing focus from the search box or interrupting a review
  renderNav();
  if (state.route === 'library' && $('#list')) renderList();
  else if (state.route !== 'review' || !state.review) render();
}

async function removeEntry(id) {
  const e = findEntry(id);
  if (!e) return;
  await db.remove(id);
  sync.trackDelete([id]);
  state.entries = state.entries.filter(x => x.id !== id);
  render();
  toast(`Deleted “${trunc(e.text)}”`, {
    action: 'Undo',
    onAction: async () => { await upsert(e); render(); toast('Restored'); },
  });
}

async function toggleStar(id) {
  const e = findEntry(id);
  if (!e) return;
  await upsert({ ...e, starred: !e.starred });
  renderNav();
  if (state.route === 'library') renderList(); else render();
}

/* =====================================================================
   Entry form (add / edit)
   ===================================================================== */
function dictLinks(text) {
  const w = encodeURIComponent(text.trim());
  if (!w) return '';
  const cam = encodeURIComponent(text.trim().toLowerCase().replace(/\s+/g, '-'));
  return `
    <a href="https://dictionary.cambridge.org/dictionary/english/${cam}" target="_blank" rel="noopener">Cambridge ${icon('external')}</a>
    <a href="https://www.merriam-webster.com/dictionary/${w}" target="_blank" rel="noopener">Merriam-Webster ${icon('external')}</a>
    <a href="https://youglish.com/pronounce/${w}/english" target="_blank" rel="noopener" title="Hear it in real videos">YouGlish ${icon('external')}</a>`;
}

function openEntryForm(existing = null, preset = {}) {
  const e = existing || { movie: preset.movie ?? settings.lastMovie ?? '', type: 'word', tags: [] };
  const editing = !!existing;
  let type = e.type || 'word';
  let typeTouched = editing;
  const movies = movieList().map(m => m.name);
  const tags = tagList().map(t => t[0]);

  const m = openModal(`
    <form id="entry-form" autocomplete="off">
      <div class="modal-head"><h2>${editing ? 'Edit entry' : 'New entry'}</h2>${closeBtn}</div>
      <div class="modal-body">
        <div class="field main-input">
          <textarea name="text" rows="1" placeholder="Type a word, phrase or line…" required>${esc(e.text)}</textarea>
        </div>
        <div class="type-row">
          <div class="seg" id="type-seg">
            ${Object.entries(TYPES).map(([k, v]) => `<button type="button" data-v="${k}" class="${type === k ? 'on' : ''}">${v.label}</button>`).join('')}
          </div>
          <span class="hint" id="type-hint">${typeTouched ? '' : 'Auto-detected'}</span>
          <button type="button" class="btn sm" id="lookup-btn">${icon('zap')}Look up</button>
          <div class="ext" id="ext-links">${dictLinks(e.text || '')}</div>
        </div>
        <div id="lookup-box"></div>
        <div class="grid2 r">
          <div class="field"><label>Meaning</label><input class="input" name="meaning" value="${esc(e.meaning)}" placeholder="Definition or translation"></div>
          <div class="field"><label>Pronunciation <span class="opt">optional</span></label><input class="input" name="phonetic" value="${esc(e.phonetic)}" placeholder="/ˈeksəmpəl/"></div>
        </div>
        <div class="grid2 r">
          <div class="field"><label>${icon('film')}Movie / Show</label>
            <input class="input" name="movie" list="movie-options" value="${esc(e.movie)}" placeholder="e.g. Friends S01E03">
            <datalist id="movie-options">${movies.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
          </div>
          <div class="field"><label>${icon('clock')}Timestamp <span class="opt">optional</span></label><input class="input" name="time" value="${esc(e.time)}" placeholder="01:23:45" inputmode="numeric"></div>
        </div>
        <div class="field"><label>Original line / context <span class="opt">optional</span></label><textarea class="textarea" name="context" rows="2" placeholder="The line where you heard it — makes reviewing much more vivid">${esc(e.context)}</textarea></div>
        <div class="field"><label>Notes <span class="opt">optional</span></label><textarea class="textarea" name="notes" rows="2" placeholder="Usage, synonyms, when to say it…">${esc(e.notes)}</textarea></div>
        <div class="field"><label>Tags <span class="opt">comma-separated</span></label>
          <input class="input" name="tags" list="tag-options" value="${esc((e.tags || []).join(', '))}" placeholder="slang, idiom, work">
          <datalist id="tag-options">${tags.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
        </div>
      </div>
      <div class="modal-foot">
        <div class="left">
          ${editing
            ? `<button type="button" class="btn ghost danger sm" id="del-btn">${icon('trash')}Delete</button>`
            : `<label class="check"><input type="checkbox" id="keep" ${settings.keepAdding ? 'checked' : ''}>Keep adding</label>`}
          <span class="hide-mobile"><kbd>⌘</kbd> <kbd>↵</kbd> to save</span>
        </div>
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn primary">Save</button>
      </div>
    </form>`);

  const form = $('#entry-form', m);
  const textEl = form.text;
  const seg = $('#type-seg', m);
  const hint = $('#type-hint', m);
  const ext = $('#ext-links', m);

  const autosize = () => { textEl.style.height = 'auto'; textEl.style.height = textEl.scrollHeight + 'px'; };
  const setType = t => { type = t; $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.v === t)); };
  autosize();

  textEl.addEventListener('input', () => {
    autosize();
    if (!typeTouched) setType(detectType(textEl.value));
    ext.innerHTML = dictLinks(textEl.value);
  });
  textEl.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey && !ev.metaKey && !ev.ctrlKey) { ev.preventDefault(); form.meaning.focus(); } });
  seg.addEventListener('click', ev => {
    const b = ev.target.closest('button'); if (!b) return;
    typeTouched = true; hint.textContent = ''; setType(b.dataset.v);
  });
  $('#lookup-btn', m).onclick = () => lookup(textEl.value, $('#lookup-box', m), form);
  $('#keep', m)?.addEventListener('change', ev => { settings.keepAdding = ev.target.checked; saveSettings(); });
  $('#del-btn', m)?.addEventListener('click', () => { closeModal(); removeEntry(existing.id); });

  form.onsubmit = async ev => {
    ev.preventDefault();
    const now = Date.now();
    const data = normalize({
      ...(existing || {}),
      text: form.text.value, type, meaning: form.meaning.value, phonetic: form.phonetic.value,
      movie: form.movie.value, time: form.time.value, context: form.context.value,
      notes: form.notes.value, tags: form.tags.value,
      updatedAt: now,
    }, now);
    if (!data) { textEl.focus(); return; }

    const dup = !editing && state.entries.find(x => x.text.toLowerCase() === data.text.toLowerCase());
    await upsert(data);
    if (data.movie) { settings.lastMovie = data.movie; saveSettings(); }
    render();
    toast(editing ? 'Updated' : dup ? 'Saved (you’ve logged this one before)' : 'Saved');

    if (!editing && settings.keepAdding) {
      ['text', 'meaning', 'phonetic', 'time', 'context', 'notes'].forEach(k => { form[k].value = ''; });
      $('#lookup-box', m).innerHTML = '';
      ext.innerHTML = '';
      typeTouched = false; hint.textContent = 'Auto-detected'; setType('word');
      autosize();
      $('#movie-options', m).innerHTML = movieList().map(x => `<option value="${esc(x.name)}">`).join('');
      textEl.focus();
    } else {
      closeModal();
    }
  };

  setTimeout(() => textEl.focus(), 30);
}

async function lookup(text, box, form) {
  const word = text.trim();
  if (!word) { box.innerHTML = `<div class="lookup err">Type something to look up first.</div>`; return; }
  if (word.split(/\s+/).length > 4) { box.innerHTML = `<div class="lookup err">Full sentences can’t be looked up — try the dictionary links above.</div>`; return; }
  box.innerHTML = `<div class="lookup loading">Looking up…</div>`;
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    const phon = data.map(d => d.phonetic || d.phonetics?.find(p => p.text)?.text).find(Boolean) || '';
    const defs = data.flatMap(d => d.meanings.flatMap(mn => mn.definitions.slice(0, 2).map(df => ({ pos: mn.partOfSpeech, def: df.definition, ex: df.example })))).slice(0, 6);
    if (phon && !form.phonetic.value) form.phonetic.value = phon;
    box.innerHTML = `<div class="lookup">
      ${phon ? `<div class="phon">${esc(phon)} <button type="button" class="icon-btn" data-say>${icon('volume')}</button></div>` : ''}
      <ul>${defs.map((d, i) => `<li><button type="button" data-i="${i}"><span class="pos">${esc(d.pos)}</span>${esc(d.def)}${d.ex ? `<span class="ex">e.g. ${esc(d.ex)}</span>` : ''}</button></li>`).join('')}</ul>
      <div class="small muted" style="margin-top:6px">Click a definition to use it as the meaning (or add it to notes).</div>
    </div>`;
    box.querySelector('[data-say]')?.addEventListener('click', () => speak(word));
    $$('[data-i]', box).forEach(b => b.onclick = () => {
      const d = defs[+b.dataset.i];
      if (!form.meaning.value.trim()) form.meaning.value = d.def;
      else {
        const line = `(${d.pos}) ${d.def}`;
        form.notes.value = form.notes.value ? form.notes.value + '\n' + line : line;
      }
      b.style.opacity = .5;
    });
  } catch {
    box.innerHTML = `<div class="lookup err">No result (it may be slang, a name, or you’re offline). Try the dictionary links above.</div>`;
  }
}

/* =====================================================================
   Navigation
   ===================================================================== */
const ROUTES = [
  { id: 'library', label: 'Library', icon: 'book' },
  { id: 'movies', label: 'Movies', icon: 'film' },
  { id: 'review', label: 'Review', icon: 'layers' },
  { id: 'stats', label: 'Stats', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'sliders' },
];

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '') || 'library';
  const [path, qs] = h.split('?');
  return { path: ROUTES.some(r => r.id === path) ? path : 'library', params: new URLSearchParams(qs || '') };
}

function renderNav() {
  const due = dueList().length;
  const extra = {
    library: `<span class="count">${state.entries.length || ''}</span>`,
    movies: `<span class="count">${movieList().length || ''}</span>`,
    review: due ? `<span class="badge-due">${due}</span>` : '',
  };
  $('#nav').innerHTML = ROUTES.map(r =>
    `<a href="#/${r.id}" class="${state.route === r.id ? 'active' : ''}">${icon(r.icon)}${r.label}${extra[r.id] || ''}</a>`).join('');
  $('#tabbar').innerHTML = ROUTES.map(r =>
    `<a href="#/${r.id}" class="${state.route === r.id ? 'active' : ''}">${icon(r.icon)}<span>${r.label}</span>${r.id === 'review' && due ? `<span class="dot">${due > 99 ? '99+' : due}</span>` : ''}</a>`).join('');
  renderSidebarFoot();
}

function renderSidebarFoot() {
  const s = streak();
  $('#sidebar-foot').innerHTML = (state.entries.length
    ? `<div class="streak"><b>${s}</b> day streak ${s >= 3 ? '🔥' : ''}</div>`
    : '') + accountWidget();
}

/* =====================================================================
   Account & sync UI
   ===================================================================== */
function syncLabel(s) {
  switch (s.status) {
    case 'loading': return 'Connecting…';
    case 'syncing': return 'Syncing…';
    case 'synced': return 'Synced ' + (s.lastSyncedAt ? relTime(s.lastSyncedAt) : '');
    case 'offline': return 'Offline — will sync later';
    case 'error': return 'Sync failed — will retry';
    default: return '';
  }
}

function accountWidget() {
  if (!sync.enabled) return '';
  const s = sync.getStatus();
  if (!sync.getUser()) {
    return `<button class="account" data-action="signin">${icon('cloud')}<span><b>Sign in to sync</b><small>Back up &amp; use on any device</small></span></button>`;
  }
  return `<a class="account" href="#/settings"><i class="sync-dot ${s.status}"></i><span><b>${esc(s.email)}</b><small>${syncLabel(s)}</small></span></a>`;
}

const signInFormHTML = () => `
  <form class="signin-form" data-signin novalidate>
    <input class="input" type="email" name="email" required placeholder="you@example.com" autocomplete="email">
    <button class="btn primary">Send sign-in link</button>
  </form>
  <p class="small muted signin-msg">We’ll email you a link — no password needed. Open it in this browser.</p>
  <p class="small muted" style="margin:4px 0 0">By signing in, you agree to our <a href="privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</p>`;

function accountPanelHTML() {
  if (!sync.enabled) return '';
  const u = sync.getUser();
  const s = sync.getStatus();
  if (!u) {
    return `<section class="panel" id="account-panel">
      <h3>ACCOUNT &amp; SYNC</h3>
      <div class="setting"><div class="txt"><b>Sign in to sync</b><span>Back up your entries to the cloud and use them on any device.</span></div></div>
      ${signInFormHTML()}
    </section>`;
  }
  return `<section class="panel" id="account-panel">
    <h3>ACCOUNT &amp; SYNC</h3>
    <div class="setting">
      <div class="txt"><b>${esc(u.email)}</b>
        <span><i class="sync-dot ${s.status}"></i>${syncLabel(s)}${s.status === 'error' && s.lastError ? ` (${esc(s.lastError)})` : ''}${s.pending ? ` · ${s.pending} change${s.pending === 1 ? '' : 's'} waiting` : ''}</span>
      </div>
      <div class="ctrl">
        <button class="btn sm" data-action="sync-now">${icon('rotate')}Sync now</button>
        <button class="btn sm" data-action="signout">Sign out</button>
      </div>
    </div>
    <div class="setting">
      <div class="txt"><b>Delete account</b><span>Permanently deletes your account and every synced entry</span></div>
      <div class="ctrl"><button class="btn sm danger" data-action="delete-account">${icon('trash')}Delete account</button></div>
    </div>
  </section>`;
}

function onSyncStatus() {
  renderSidebarFoot();
  const panel = $('#account-panel');
  // Don't wipe the email field while someone is typing in it
  if (panel && !panel.contains(document.activeElement)) panel.outerHTML = accountPanelHTML();
}

function openSignIn() {
  openModal(`
    <div class="modal-head"><h2>Sign in to sync</h2>${closeBtn}</div>
    <div class="modal-body">
      <p>Your entries will be backed up and kept in sync across all your devices. Anything already on this device is added to your account.</p>
      ${signInFormHTML()}
    </div>`, { size: 'sm' });
  setTimeout(() => $('#modal-root input[name=email]')?.focus(), 30);
}

document.addEventListener('submit', async ev => {
  const form = ev.target.closest('form[data-signin]');
  if (!form) return;
  ev.preventDefault();
  const email = form.email.value.trim();
  const msg = form.nextElementSibling;
  if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = 'Please enter a valid email address.'; form.email.focus(); return; }
  const btn = form.querySelector('button');
  btn.disabled = true; btn.textContent = 'Sending…';
  try {
    await sync.sendLink(email);
    form.outerHTML = `<div class="lookup">📬 Check your inbox at <b>${esc(email)}</b> and open the link <b>in this browser</b> to finish signing in.</div>`;
    msg.textContent = 'Didn’t get it? Check spam, or wait a minute and try again.';
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Send sign-in link';
    msg.textContent = 'Couldn’t send the link: ' + (e.message || 'unknown error');
  }
});

async function doSignOut() {
  const ok = await confirmDialog({
    title: 'Sign out?',
    body: 'Your entries are safe in your account. They’ll be removed from this device and come back when you sign in again.',
    ok: 'Sign out',
  });
  if (!ok) return;
  let r = await sync.signOut();
  if (!r.ok) {
    const force = await confirmDialog({
      title: 'Some changes haven’t synced',
      body: `${r.unsynced} change${r.unsynced === 1 ? '' : 's'} couldn’t be uploaded (are you offline?). If you sign out now, they’ll be lost.`,
      ok: 'Sign out anyway', danger: true,
    });
    if (!force) return;
    r = await sync.signOut({ force: true });
  }
  toast('Signed out');
}

async function doDeleteAccount() {
  const ok = await confirmDialog({
    title: 'Delete your account?',
    body: 'This permanently deletes your account and <b>every entry stored in the cloud</b>, on all devices. It can’t be undone. Export a JSON backup first if you want to keep anything.',
    ok: 'Delete account', danger: true,
  });
  if (!ok) return;
  try {
    await sync.deleteAccount();
    toast('Account deleted');
  } catch (e) {
    toast('Couldn’t delete account: ' + (e.message || 'unknown error'));
  }
}

function render() {
  const { path, params } = parseHash();
  if (path !== state.route) window.scrollTo(0, 0);
  state.route = path;
  renderNav();
  const views = { library: viewLibrary, movies: viewMovies, review: viewReview, stats: viewStats, settings: viewSettings };
  views[path](params);
}

/* =====================================================================
   View: Library
   ===================================================================== */
function viewLibrary(params) {
  if (params.has('movie') || params.has('tag')) {
    state.filters = { ...defaultFilters(), movie: params.get('movie') || '', tag: params.get('tag') || '' };
    history.replaceState(null, '', '#/library');
  }
  const f = state.filters;
  const movies = movieList();
  const tags = tagList();
  const main = $('#main');

  if (!state.entries.length) {
    main.innerHTML = `
      <header class="page-head"><div><h1>Library</h1><p class="sub">Your personal movie-English notebook</p></div></header>
      <div class="empty-state">
        <div class="art">🎬</div>
        <h2>Start with your first movie</h2>
        <p>Heard a great word or a natural expression? Press <kbd>N</kbd> or tap the button below to save it in seconds — then review it with spaced repetition until it sticks.</p>
        <div class="row">
          <button class="btn primary lg" data-action="new">${icon('plus')}Add your first entry</button>
          <button class="btn lg" data-action="sample">Load sample data</button>
        </div>
      </div>`;
    return;
  }

  const movieOpts = movies.map(m => m.name);
  if (f.movie && !movieOpts.includes(f.movie)) movieOpts.unshift(f.movie);
  const tagOpts = tags.map(t => t[0]);
  if (f.tag && !tagOpts.includes(f.tag)) tagOpts.unshift(f.tag);

  main.innerHTML = `
    <header class="page-head">
      <div><h1>Library</h1><p class="sub">${plural(state.entries.length, 'entry', 'entries')} · from ${plural(movies.length, 'title')}</p></div>
      <button class="btn primary hide-mobile" data-action="new">${icon('plus')}New entry <kbd>N</kbd></button>
    </header>
    <div class="toolbar">
      <label class="search">${icon('search')}
        <input id="q" type="search" placeholder="Search words, meanings, lines, notes…" value="${esc(f.q)}" autocomplete="off">
        <kbd class="hide-mobile">/</kbd>
      </label>
      <div class="filters">
        <div class="seg" id="type-filter">
          ${['all', 'word', 'phrase', 'sentence'].map(t => `<button data-v="${t}" class="${f.type === t ? 'on' : ''}">${t === 'all' ? 'All' : TYPES[t].label + 's'}</button>`).join('')}
        </div>
        <select class="select ${f.movie ? 'active' : ''}" id="f-movie">
          <option value="">All titles</option>
          ${movieOpts.map(n => `<option value="${esc(n)}" ${n === f.movie ? 'selected' : ''}>${esc(trunc(n, 28))}</option>`).join('')}
        </select>
        ${tagOpts.length ? `<select class="select ${f.tag ? 'active' : ''}" id="f-tag">
          <option value="">All tags</option>
          ${tagOpts.map(t => `<option value="${esc(t)}" ${t === f.tag ? 'selected' : ''}>#${esc(t)}</option>`).join('')}
        </select>` : ''}
        <select class="select ${f.status !== 'all' ? 'active' : ''}" id="f-status">
          ${[['all', 'Any status'], ['starred', '★ Starred'], ['new', 'New'], ['learning', 'Learning'], ['mastered', 'Mastered']].map(([v, l]) => `<option value="${v}" ${v === f.status ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <span class="spacer"></span>
        <select class="select" id="f-sort">
          ${[['newest', 'Newest first'], ['oldest', 'Oldest first'], ['az', 'A → Z'], ['due', 'Due soonest'], ['movie', 'By title']].map(([v, l]) => `<option value="${v}" ${v === f.sort ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="list"></div>`;

  const q = $('#q');
  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { f.q = q.value; renderList(); }, 120); });
  $('#type-filter').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    f.type = b.dataset.v; $$('#type-filter button').forEach(x => x.classList.toggle('on', x === b)); renderList();
  });
  const bindSelect = (id, key) => $(id)?.addEventListener('change', e => {
    f[key] = e.target.value;
    e.target.classList.toggle('active', key !== 'sort' && !!e.target.value && e.target.value !== 'all');
    renderList();
  });
  bindSelect('#f-movie', 'movie'); bindSelect('#f-tag', 'tag'); bindSelect('#f-status', 'status'); bindSelect('#f-sort', 'sort');
  renderList();
}

function filteredEntries() {
  const f = state.filters;
  const q = f.q.trim().toLowerCase();
  const list = state.entries.filter(e => {
    if (f.type !== 'all' && e.type !== f.type) return false;
    if (f.movie && e.movie !== f.movie) return false;
    if (f.tag && !(e.tags || []).includes(f.tag)) return false;
    if (f.status === 'starred' && !e.starred) return false;
    if (STATUS[f.status] && statusOf(e.srs) !== f.status) return false;
    if (q) {
      const hay = [e.text, e.meaning, e.context, e.notes, e.movie, e.phonetic, ...(e.tags || [])].join('\n').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const sorters = {
    newest: (a, b) => b.createdAt - a.createdAt,
    oldest: (a, b) => a.createdAt - b.createdAt,
    az: (a, b) => a.text.localeCompare(b.text, 'en', { sensitivity: 'base' }),
    due: (a, b) => (a.srs?.due ?? 0) - (b.srs?.due ?? 0),
    movie: (a, b) => (a.movie || '￿').localeCompare(b.movie || '￿') || b.createdAt - a.createdAt,
  };
  return list.sort(sorters[f.sort] || sorters.newest);
}

function highlight(context, text) {
  const c = esc(context);
  const t = text.trim();
  if (!t || t.length > 120) return c;
  const re = new RegExp(escRe(esc(t)), 'gi');
  return c.replace(re, m => `<mark>${m}</mark>`);
}

function cardHTML(e, i = 0) {
  const st = statusOf(e.srs);
  return `
  <article class="card" data-type="${e.type}" data-id="${e.id}" style="animation-delay:${Math.min(i, 12) * 25}ms">
    <div class="card-top">
      <span class="type-badge ${e.type}">${TYPES[e.type].label}</span>
      <span class="status ${st}">${STATUS[st]}</span>
      <div class="actions">
        <button class="icon-btn" data-action="speak" title="Read aloud">${icon('volume')}</button>
        <button class="icon-btn ${e.starred ? 'on' : ''}" data-action="star" title="Star">${icon('star')}</button>
        <button class="icon-btn danger" data-action="delete" title="Delete">${icon('trash')}</button>
      </div>
    </div>
    <h3 class="headword">${esc(e.text)}${e.phonetic ? `<span class="phonetic">${esc(e.phonetic)}</span>` : ''}</h3>
    ${e.meaning ? `<p class="meaning">${esc(e.meaning)}</p>` : `<p class="meaning empty">No meaning yet</p>`}
    ${e.context ? `<p class="context">${highlight(e.context, e.text)}</p>` : ''}
    ${e.notes ? `<p class="notes">${esc(e.notes)}</p>` : ''}
    ${e.tags?.length ? `<div class="tags">${e.tags.map(t => `<button class="tag" data-action="tag" data-tag="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
    <div class="card-foot">
      ${e.movie ? `<button class="movie" data-action="movie" data-movie="${esc(e.movie)}">${icon('film')}<span>${esc(e.movie)}</span></button>` : '<span>No title</span>'}
      ${e.time ? `<span class="time">${esc(e.time)}</span>` : ''}
      <span class="when">${relTime(e.createdAt)}</span>
    </div>
  </article>`;
}

function renderList() {
  const box = $('#list');
  if (!box) return;
  const f = state.filters;
  const list = filteredEntries();
  const active = f.q || f.type !== 'all' || f.movie || f.tag || f.status !== 'all';
  const line = active
    ? `<div class="result-line">${plural(list.length, 'result')} <button class="link" data-action="clear-filters">Clear filters</button></div>`
    : '';
  if (!list.length) {
    box.innerHTML = line + `<div class="empty-state"><div class="art">🔍</div><h2>Nothing matches</h2><p>Try a different search, or clear the filters.</p>
      <div class="row"><button class="btn" data-action="clear-filters">Clear filters</button></div></div>`;
    return;
  }
  box.innerHTML = line + `<div class="grid">${list.map(cardHTML).join('')}</div>`;
}

/* =====================================================================
   View: Movies
   ===================================================================== */
function viewMovies() {
  const movies = movieList();
  const untagged = state.entries.filter(e => !e.movie).length;
  const main = $('#main');
  main.innerHTML = `
    <header class="page-head">
      <div><h1>Movies</h1><p class="sub">${plural(movies.length, 'title')}${untagged ? ` · ${untagged} without a title` : ''}</p></div>
      <div class="legend"><span><i style="background:var(--word)"></i>Words</span><span><i style="background:var(--phrase)"></i>Phrases</span><span><i style="background:var(--sentence)"></i>Sentences</span></div>
    </header>
    ${movies.length ? `<div class="movie-grid">${movies.map((m, i) => `
      <div class="movie-card" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <button class="icon-btn" data-action="rename-movie" data-movie="${esc(m.name)}" title="Rename">${icon('edit')}</button>
        <a href="#/library?movie=${encodeURIComponent(m.name)}" class="cover" style="--h:${hue(m.name)}">
          <span class="initial">${initialOf(m.name)}</span>
          <span class="title">${esc(m.name)}</span>
          <span class="count">${plural(m.count, 'entry', 'entries')} · ${relTime(m.last)}</span>
        </a>
        <div class="movie-meta">
          <div class="mini-bar" title="${m.word} words · ${m.phrase} phrases · ${m.sentence} sentences">
            <span style="flex:${m.word}"></span><span style="flex:${m.phrase}"></span><span style="flex:${m.sentence}"></span>
          </div>
          <button class="btn sm ghost" data-action="add-to-movie" data-movie="${esc(m.name)}" title="Add an entry for this title">${icon('plus')}</button>
        </div>
      </div>`).join('')}</div>`
    : `<div class="empty-state"><div class="art">🍿</div><h2>No movies yet</h2><p>Fill in “Movie / Show” when you add an entry and your movie wall builds itself.</p>
       <div class="row"><button class="btn primary" data-action="new">${icon('plus')}New entry</button></div></div>`}`;
}

async function renameMovie(oldName) {
  const name = await promptDialog({ title: 'Rename title', label: 'New name (updates every related entry)', value: oldName });
  if (!name || name === oldName) return;
  const changed = state.entries.filter(e => e.movie === oldName).map(e => ({ ...e, movie: name, updatedAt: Date.now() }));
  await db.putMany(changed);
  sync.trackPut(changed.map(c => c.id));
  changed.forEach(c => { const i = state.entries.findIndex(e => e.id === c.id); state.entries[i] = c; });
  if (settings.lastMovie === oldName) { settings.lastMovie = name; saveSettings(); }
  if (state.filters.movie === oldName) state.filters.movie = name;
  render();
  toast(`Updated ${plural(changed.length, 'entry', 'entries')}`);
}

/* =====================================================================
   View: Review
   ===================================================================== */
function viewReview() {
  const r = state.review;
  if (r && !r.finished) return renderSession();
  if (r && r.finished) return renderSummary();

  const p = state.reviewPrefs;
  const movies = movieList();
  if (p.scope && !movies.some(m => m.name === p.scope)) p.scope = '';
  const inScope = e => !p.scope || e.movie === p.scope;
  const due = dueList().filter(inScope);
  const newCount = due.filter(e => statusOf(e.srs) === 'new').length;
  const total = state.entries.filter(inScope).length;

  $('#main').innerHTML = `
    <header class="page-head"><div><h1>Review</h1><p class="sub">Spaced repetition — see each card again right before you’d forget it</p></div></header>
    ${!state.entries.length ? `<div class="empty-state"><div class="art">🃏</div><h2>Nothing to review yet</h2><p>Add a few entries first.</p><div class="row"><button class="btn primary" data-action="new">${icon('plus')}New entry</button></div></div>` : `
    <div class="review-start">
      <div class="panel">
        <h3>DUE TODAY</h3>
        <div class="hero-num">${due.length}</div>
        <p>${due.length ? `${newCount} new, ${due.length - newCount} due for review.` : 'All caught up for today 🎉 Try a round of free practice.'}</p>
        <div class="btn-row">
          <button class="btn primary lg" data-action="start-review" ${due.length ? '' : 'disabled'}>Start review</button>
          <button class="btn lg" data-action="start-practice" ${total ? '' : 'disabled'}>${icon('rotate')}Practice ${Math.min(20, total)} random</button>
        </div>
      </div>
      <div class="panel">
        <h3>OPTIONS</h3>
        <div class="opt-row">
          <label for="r-scope">Scope</label>
          <select class="select" id="r-scope">
            <option value="">All titles (${dueList().length} due)</option>
            ${movies.map(m => `<option value="${esc(m.name)}" ${m.name === p.scope ? 'selected' : ''}>${esc(trunc(m.name, 30))} (${m.due})</option>`).join('')}
          </select>
        </div>
        <div class="opt-row">
          <label>Direction</label>
          <div class="seg" id="r-dir">
            <button data-v="forward" class="${p.dir === 'forward' ? 'on' : ''}">English → Meaning</button>
            <button data-v="reverse" class="${p.dir === 'reverse' ? 'on' : ''}">Meaning → English</button>
          </div>
        </div>
        <p class="small muted" style="margin:0">Shortcuts: <kbd>Space</kbd> flip, <kbd>1</kbd>–<kbd>4</kbd> grade, <kbd>P</kbd> read aloud. Free practice doesn’t change your schedule.</p>
      </div>
    </div>`}`;

  $('#r-scope')?.addEventListener('change', e => { p.scope = e.target.value; render(); });
  $('#r-dir')?.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { p.dir = b.dataset.v; render(); } });
}

function startReview(practice) {
  const p = state.reviewPrefs;
  const pool = state.entries.filter(e => !p.scope || e.movie === p.scope);
  let ids;
  if (practice) ids = shuffle(pool.map(e => e.id)).slice(0, 20);
  else {
    // Due reviews first, then new cards (oldest first)
    const due = pool.filter(e => isDue(e.srs));
    const old = shuffle(due.filter(e => statusOf(e.srs) !== 'new'));
    const fresh = due.filter(e => statusOf(e.srs) === 'new').sort((a, b) => a.createdAt - b.createdAt);
    ids = [...old, ...fresh].map(e => e.id);
  }
  if (!ids.length) return;
  // Reverse mode needs a meaning to show
  if (p.dir === 'reverse') ids = ids.filter(id => findEntry(id)?.meaning);
  if (!ids.length) return toast('None of these have a meaning yet, so they can’t be reviewed in reverse');
  state.review = { queue: ids, idx: 0, flipped: false, practice, dir: p.dir, counts: [0, 0, 0, 0], unique: new Set(), finished: false };
  render();
}

function renderSession() {
  const r = state.review;
  let e = findEntry(r.queue[r.idx]);
  while (!e && r.idx < r.queue.length) { r.idx++; e = findEntry(r.queue[r.idx]); }
  if (!e) { r.finished = true; return renderSummary(); }

  const reverse = r.dir === 'reverse';
  const masked = e.context ? highlight(e.context, e.text).replace(/<mark>.*?<\/mark>/g, '<span class="blank">____</span>') : '';
  const front = reverse
    ? `<p class="big cn">${esc(e.meaning)}</p>${masked ? `<p class="context">${masked}</p>` : ''}`
    : `<p class="big ${e.type === 'sentence' ? 'sentence' : ''}">${esc(e.text)}</p>${e.phonetic ? `<div class="phonetic">${esc(e.phonetic)}</div>` : ''}${e.context ? `<p class="context">${highlight(e.context, e.text)}</p>` : ''}`;
  const back = reverse
    ? `<p class="big ${e.type === 'sentence' ? 'sentence' : ''}" style="font-size:clamp(22px,4vw,32px)">${esc(e.text)}</p>${e.phonetic ? `<div class="phonetic">${esc(e.phonetic)}</div>` : ''}${e.notes ? `<p class="notes">${esc(e.notes)}</p>` : ''}`
    : `${e.meaning ? `<p class="meaning">${esc(e.meaning)}</p>` : `<p class="meaning empty">No meaning yet</p>`}${e.notes ? `<p class="notes">${esc(e.notes)}</p>` : ''}`;

  const labels = ['Again', 'Hard', 'Good', 'Easy'];
  const pct = Math.round((r.idx / r.queue.length) * 100);

  $('#main').innerHTML = `
    <div class="session">
      <div class="session-top">
        <button class="btn ghost sm" data-action="end-review">${icon('x')}End</button>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <span class="num">${r.idx + 1} / ${r.queue.length}</span>
      </div>
      <div class="flash" data-type="${e.type}">
        <span class="type-badge ${e.type}">${TYPES[e.type].label}${r.practice ? ' · Practice' : ''}</span>
        <button class="icon-btn speak" data-action="speak-current" title="Read aloud (P)">${icon('volume')}</button>
        ${front}
        ${e.movie ? `<span class="src">${icon('film')}${esc(e.movie)}${e.time ? ` · ${esc(e.time)}` : ''}</span>` : ''}
        ${r.flipped ? `<div class="answer">${back}</div>` : ''}
      </div>
      ${r.flipped
        ? `<div class="grades">${labels.map((l, q) => `<button class="grade g${q}" data-action="grade" data-q="${q}">${l}<small>${r.practice ? '&nbsp;' : previewInterval(e.srs, q)}</small><kbd>${q + 1}</kbd></button>`).join('')}</div>`
        : `<button class="btn primary lg reveal" data-action="flip">Show answer <kbd>Space</kbd></button>`}
    </div>`;
  if (r.flipped && reverse) speak(e.text);
}

async function gradeCurrent(q) {
  const r = state.review;
  if (!r || r.finished || !r.flipped) return;
  const id = r.queue[r.idx];
  const e = findEntry(id);
  if (e && !r.practice) await upsert({ ...e, srs: grade(e.srs, q) });
  r.counts[q]++;
  r.unique.add(id);
  if (q === 0 && !r.practice) r.queue.push(id); // forgotten cards come back at the end of this session
  r.idx++;
  r.flipped = false;
  if (r.idx >= r.queue.length) r.finished = true;
  renderNav();
  viewReview();
}

function renderSummary() {
  const r = state.review;
  const [a, h, g, ez] = r.counts;
  const total = a + h + g + ez;
  const rate = total ? Math.round(((g + ez) / total) * 100) : 0;
  $('#main').innerHTML = `
    <div class="summary">
      <div class="art">${rate >= 80 ? '🏆' : rate >= 50 ? '💪' : '🌱'}</div>
      <h2>${r.practice ? 'Practice complete' : 'Review complete'}</h2>
      <p class="muted">${plural(r.unique.size, 'card')} reviewed · ${rate}% recalled</p>
      <div class="summary-stats">
        <div><b style="color:var(--danger)">${a}</b><span>Again</span></div>
        <div><b style="color:var(--star)">${h}</b><span>Hard</span></div>
        <div><b style="color:var(--ok)">${g}</b><span>Good</span></div>
        <div><b style="color:var(--word)">${ez}</b><span>Easy</span></div>
      </div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn primary lg" data-action="end-review">Done</button>
        <a class="btn lg" href="#/stats">View stats</a>
      </div>
    </div>`;
}

/* =====================================================================
   View: Stats
   ===================================================================== */
function viewStats() {
  const E = state.entries;
  if (!E.length) {
    $('#main').innerHTML = `<header class="page-head"><div><h1>Stats</h1></div></header>
      <div class="empty-state"><div class="art">📈</div><h2>No data yet</h2><p>Add a few entries and your progress will show up here.</p></div>`;
    return;
  }
  const weekAgo = startOfDay() - 6 * DAY;
  const thisWeek = E.filter(e => e.createdAt >= weekAgo).length;
  const st = { new: 0, learning: 0, mastered: 0 };
  E.forEach(e => st[statusOf(e.srs)]++);
  const byType = { word: 0, phrase: 0, sentence: 0 };
  E.forEach(e => byType[e.type]++);
  const movies = movieList().sort((a, b) => b.count - a.count).slice(0, 8);
  const maxMovie = movies[0]?.count || 1;
  const tags = tagList().slice(0, 24);

  // Heatmap: last 20 weeks, Monday first
  const perDay = new Map();
  E.forEach(e => { const k = dayKey(e.createdAt); perDay.set(k, (perDay.get(k) || 0) + 1); });
  const WEEKS = 20;
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7);
  const cells = [];
  for (let d = new Date(start); cells.length < WEEKS * 7; d.setDate(d.getDate() + 1)) {
    const n = perDay.get(dayKey(d.getTime())) || 0;
    const future = d > today;
    const lv = n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4;
    cells.push(`<i class="${future ? 'future' : lv ? 'l' + lv : ''}" title="${fmtDate(d.getTime())}: ${plural(n, 'entry', 'entries')}"></i>`);
  }
  const activeDays = perDay.size;
  const s = streak();

  const pct = n => Math.round((n / E.length) * 100);
  $('#main').innerHTML = `
    <header class="page-head"><div><h1>Stats</h1><p class="sub">Since ${fmtDate(Math.min(...E.map(e => e.createdAt)), true)} · ${plural(activeDays, 'active day')}</p></div></header>
    <div class="kpis">
      <div class="kpi"><div class="label">Total entries</div><div class="value">${E.length}</div><div class="hint">${plural(movieList().length, 'title')}</div></div>
      <div class="kpi"><div class="label">Last 7 days</div><div class="value">${thisWeek}</div><div class="hint">${(thisWeek / 7).toFixed(1)} per day</div></div>
      <div class="kpi"><div class="label">Streak</div><div class="value">${s}<small>${s === 1 ? 'day' : 'days'}</small></div><div class="hint">${s >= 3 ? 'Keep it going 🔥' : 'One entry a day is enough'}</div></div>
      <div class="kpi"><div class="label">Mastered</div><div class="value">${st.mastered}</div><div class="hint">${st.learning} learning · ${st.new} new</div></div>
    </div>
    <div class="stats-grid">
      <div class="panel wide">
        <h3>ACTIVITY · LAST ${WEEKS} WEEKS</h3>
        <div class="heat-wrap"><div class="heatmap">${cells.join('')}</div></div>
        <div class="heat-legend">Less<span></span><i style="background:var(--heat-0)"></i><i style="background:color-mix(in srgb,var(--accent) 30%,var(--heat-0))"></i><i style="background:color-mix(in srgb,var(--accent) 55%,var(--heat-0))"></i><i style="background:color-mix(in srgb,var(--accent) 80%,var(--heat-0))"></i><i style="background:var(--accent)"></i><span></span>More</div>
      </div>
      <div class="panel">
        <h3>BY TYPE</h3>
        <div class="stack"><span style="flex:${byType.word}"></span><span style="flex:${byType.phrase}"></span><span style="flex:${byType.sentence}"></span></div>
        <div class="dist-list">
          ${Object.entries(byType).map(([k, n]) => `<div><i style="background:var(--${k})"></i>${TYPES[k].label}s<b>${n}</b><small>${pct(n)}%</small></div>`).join('')}
        </div>
        <h3 style="margin-top:22px">PROGRESS</h3>
        <div class="dist-list">
          <div><i style="background:var(--faint)"></i>New<b>${st.new}</b><small>${pct(st.new)}%</small></div>
          <div><i style="background:var(--star)"></i>Learning<b>${st.learning}</b><small>${pct(st.learning)}%</small></div>
          <div><i style="background:var(--ok)"></i>Mastered (interval ≥ 21 days)<b>${st.mastered}</b><small>${pct(st.mastered)}%</small></div>
        </div>
      </div>
      <div class="panel">
        <h3>TOP TITLES</h3>
        ${movies.length ? `<div class="bars">${movies.map(m => `
          <a class="bar-row" href="#/library?movie=${encodeURIComponent(m.name)}"><span class="name" title="${esc(m.name)}">${esc(m.name)}</span><span class="track"><span style="width:${(m.count / maxMovie) * 100}%"></span></span><b>${m.count}</b></a>`).join('')}</div>`
        : '<p class="muted small">No entries with a title yet</p>'}
        ${tags.length ? `<h3 style="margin-top:22px">TOP TAGS</h3><div class="tags">${tags.map(([t, n]) => `<a class="tag" href="#/library?tag=${encodeURIComponent(t)}">#${esc(t)} <span class="muted">${n}</span></a>`).join('')}</div>` : ''}
      </div>
    </div>`;
}

/* =====================================================================
   View: Settings
   ===================================================================== */
function viewSettings() {
  const voices = englishVoices();
  $('#main').innerHTML = `
    <header class="page-head"><div><h1>Settings</h1><p class="sub">${sync.getUser() ? 'Your entries are backed up to your account.' : 'Your data lives only in this browser on this device — sign in or export a backup now and then.'}</p></div></header>
    <div class="settings">
      ${accountPanelHTML()}
      <section class="panel">
        <h3>APPEARANCE</h3>
        <div class="setting">
          <div class="txt"><b>Theme</b><span>Follow your system, or pick light or dark</span></div>
          <div class="ctrl"><div class="seg" id="s-theme">
            ${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button data-v="${v}" class="${settings.theme === v ? 'on' : ''}">${l}</button>`).join('')}
          </div></div>
        </div>
      </section>

      <section class="panel">
        <h3>SPEECH</h3>
        <div class="setting">
          <div class="txt"><b>Voice</b><span>${voices.length ? `${plural(voices.length, 'English voice')} available` : 'Using the browser default'}</span></div>
          <div class="ctrl">
            <select class="select" id="s-voice" style="max-width:240px">
              <option value="">Automatic</option>
              ${voices.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === settings.voice ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="setting">
          <div class="txt"><b>Speed</b><span id="rate-label">${settings.rate.toFixed(2)}×</span></div>
          <div class="ctrl">
            <input type="range" id="s-rate" min="0.5" max="1.4" step="0.05" value="${settings.rate}">
            <button class="btn sm" id="s-test">${icon('volume')}Test</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <h3>DATA</h3>
        <div class="setting">
          <div class="txt"><b>Export</b><span>JSON is a full backup; CSV opens in Excel or imports into Anki</span></div>
          <div class="ctrl">
            <button class="btn sm" data-action="export-json">${icon('download')}JSON</button>
            <button class="btn sm" data-action="export-csv">${icon('download')}CSV</button>
          </div>
        </div>
        <div class="setting">
          <div class="txt"><b>Import</b><span>Restore from a JSON backup — for duplicates, the newer version wins</span></div>
          <div class="ctrl">
            <button class="btn sm" data-action="import">${icon('upload')}Choose file</button>
            <input type="file" id="import-file" accept=".json,application/json" hidden>
          </div>
        </div>
        <div class="setting">
          <div class="txt"><b>Sample data</b><span>Add a few example entries to see how it works</span></div>
          <div class="ctrl"><button class="btn sm" data-action="sample">Load samples</button></div>
        </div>
        <div class="setting">
          <div class="txt"><b>Delete everything</b><span>Permanently removes all ${plural(state.entries.length, 'entry', 'entries')}</span></div>
          <div class="ctrl"><button class="btn sm danger" data-action="clear-all">${icon('trash')}Delete all</button></div>
        </div>
      </section>

      <section class="panel">
        <h3>KEYBOARD SHORTCUTS</h3>
        <dl class="shortcuts">
          <dt><kbd>N</kbd></dt><dd>New entry</dd>
          <dt><kbd>/</kbd></dt><dd>Search</dd>
          <dt><kbd>⌘</kbd><kbd>↵</kbd></dt><dd>Save entry</dd>
          <dt><kbd>Esc</kbd></dt><dd>Close dialog</dd>
          <dt><kbd>Space</kbd></dt><dd>Flip card during review</dd>
          <dt><kbd>1</kbd>–<kbd>4</kbd></dt><dd>Grade: Again / Hard / Good / Easy</dd>
          <dt><kbd>P</kbd></dt><dd>Read the current card aloud</dd>
        </dl>
      </section>

      <section class="panel">
        <h3>ABOUT</h3>
        <div class="setting">
          <div class="txt"><b>Privacy Policy</b><span>What we store and how to delete it</span></div>
          <div class="ctrl"><a class="btn sm" href="privacy.html" target="_blank" rel="noopener">Read ${icon('external')}</a></div>
        </div>
        <div class="setting">
          <div class="txt"><b>Open source</b><span>Report a bug or suggest a feature</span></div>
          <div class="ctrl"><a class="btn sm" href="https://github.com/Wenxian-ee/reel-words" target="_blank" rel="noopener">GitHub ${icon('external')}</a></div>
        </div>
      </section>
    </div>`;

  $('#s-theme').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    settings.theme = b.dataset.v; saveSettings(); applyTheme();
    $$('#s-theme button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#s-voice').addEventListener('change', e => { settings.voice = e.target.value; saveSettings(); speak('Hello, how are you?'); });
  $('#s-rate').addEventListener('input', e => { settings.rate = +e.target.value; $('#rate-label').textContent = settings.rate.toFixed(2) + '×'; saveSettings(); });
  $('#s-test').onclick = () => speak('Here’s looking at you, kid.');
  $('#import-file').addEventListener('change', importFile);
}

/* =====================================================================
   Import / export / sample
   ===================================================================== */
function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const stamp = () => new Date().toISOString().slice(0, 10);

function exportJSON() {
  download(`reel-words-${stamp()}.json`, JSON.stringify({ app: 'reel-words', version: 1, exportedAt: new Date().toISOString(), entries: state.entries }, null, 2), 'application/json');
  toast(`Exported ${plural(state.entries.length, 'entry', 'entries')}`);
}
function exportCSV() {
  const cols = ['text', 'meaning', 'type', 'phonetic', 'movie', 'time', 'context', 'notes', 'tags', 'createdAt'];
  const header = ['Text', 'Meaning', 'Type', 'Pronunciation', 'Title', 'Timestamp', 'Context', 'Notes', 'Tags', 'Created'];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = state.entries.map(e => cols.map(c =>
    c === 'tags' ? cell(e.tags.join(' ')) :
    c === 'type' ? cell(TYPES[e.type].label) :
    c === 'createdAt' ? cell(new Date(e.createdAt).toISOString()) : cell(e[c])).join(','));
  download(`reel-words-${stamp()}.csv`, '﻿' + [header.map(cell).join(','), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
  toast(`Exported ${plural(state.entries.length, 'entry', 'entries')}`);
}

async function importFile(ev) {
  const file = ev.target.files?.[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.entries;
    if (!Array.isArray(list)) throw new Error('unrecognised format');
    let added = 0, updated = 0;
    const toWrite = [];
    for (const raw of list) {
      const e = normalize(raw);
      if (!e) continue;
      const cur = findEntry(e.id);
      if (!cur) { added++; toWrite.push(e); }
      else if (e.updatedAt > cur.updatedAt) { updated++; toWrite.push(e); }
    }
    await db.putMany(toWrite);
    sync.trackPut(toWrite.map(e => e.id));
    for (const e of toWrite) {
      const i = state.entries.findIndex(x => x.id === e.id);
      if (i >= 0) state.entries[i] = e; else state.entries.push(e);
    }
    render();
    toast(`Import done: ${added} added, ${updated} updated`);
  } catch (err) {
    toast('Import failed: ' + (err.message || 'could not read the file'));
  }
}

async function loadSample() {
  const now = Date.now();
  const raw = [
    { text: "Life was like a box of chocolates. You never know what you're gonna get.", meaning: 'Life is full of surprises; you can’t predict what will happen.', movie: 'Forrest Gump', notes: 'Often quoted when talking about how unpredictable life is.', tags: ['classic line'], d: 9 },
    { text: 'gonna', meaning: 'informal for “going to”', phonetic: '/ˈɡɒnə/', movie: 'Forrest Gump', context: "You never know what you're gonna get.", notes: 'Casual speech only — avoid in formal writing. See also: wanna (want to), gotta (got to).', tags: ['casual'], d: 9 },
    { text: "an offer he can't refuse", meaning: 'a deal too good (or too threatening) to turn down', movie: 'The Godfather', context: "I'm gonna make him an offer he can't refuse.", notes: 'Now used jokingly for any irresistible offer.', tags: ['classic line', 'idiom'], d: 6 },
    { text: 'Houston, we have a problem.', meaning: 'Something has gone wrong.', movie: 'Apollo 13', notes: 'Used humorously in everyday life when something breaks.', tags: ['classic line', 'casual'], d: 4 },
    { text: 'just keep swimming', meaning: 'keep going; don’t give up', movie: 'Finding Nemo', context: 'Just keep swimming, just keep swimming.', notes: 'A light-hearted way to encourage yourself or someone else.', tags: ['encouragement'], d: 2, starred: true },
    { text: 'to infinity and beyond', meaning: 'without limits; aiming as high as possible', movie: 'Toy Story', context: 'To infinity and beyond!', tags: ['classic line'], d: 1 },
    { text: 'beyond', meaning: 'further than; outside the limits of', phonetic: '/bɪˈjɒnd/', movie: 'Toy Story', context: 'To infinity and beyond!', notes: 'beyond my control\nbeyond words', tags: [], d: 0 },
  ];
  const list = raw.map(({ d, ...r }) => {
    const t = now - d * DAY - Math.floor(Math.random() * 3600000);
    return normalize({ ...r, createdAt: t, updatedAt: t });
  });
  await db.putMany(list);
  sync.trackPut(list.map(e => e.id));
  state.entries.push(...list);
  render();
  toast(`Added ${list.length} sample entries`);
}

async function clearAll() {
  const ok = await confirmDialog({
    title: 'Delete everything?',
    body: `This permanently deletes all <b>${state.entries.length}</b> entries${sync.getUser() ? ' on <b>all your devices</b>' : ''} and can’t be undone. Consider exporting a JSON backup first.`,
    ok: 'Delete all', danger: true,
  });
  if (!ok) return;
  sync.trackDelete(state.entries.map(e => e.id));
  await db.clear();
  state.entries = [];
  state.review = null;
  state.filters = defaultFilters();
  render();
  toast('All data deleted');
}

/* =====================================================================
   Global events
   ===================================================================== */
document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-action]');
  const card = ev.target.closest('.card[data-id]');
  if (!el) {
    // Clicking empty space on a card opens it for editing
    if (card && !ev.target.closest('a,button,input')) openEntryForm(findEntry(card.dataset.id));
    return;
  }
  const id = card?.dataset.id;
  const a = el.dataset.action;
  switch (a) {
    case 'new': openEntryForm(); break;
    case 'add-to-movie': openEntryForm(null, { movie: el.dataset.movie }); break;
    case 'speak': speak(findEntry(id).text); break;
    case 'star': toggleStar(id); break;
    case 'delete': removeEntry(id); break;
    case 'movie': state.filters = { ...defaultFilters(), movie: el.dataset.movie }; location.hash = '#/library'; render(); break;
    case 'tag': state.filters = { ...state.filters, tag: el.dataset.tag }; render(); break;
    case 'clear-filters': state.filters = defaultFilters(); render(); break;
    case 'rename-movie': renameMovie(el.dataset.movie); break;
    case 'start-review': startReview(false); break;
    case 'start-practice': startReview(true); break;
    case 'flip': state.review.flipped = true; renderSession(); break;
    case 'grade': gradeCurrent(+el.dataset.q); break;
    case 'speak-current': { const e = findEntry(state.review?.queue[state.review.idx]); if (e) speak(e.text); break; }
    case 'end-review': state.review = null; render(); break;
    case 'export-json': exportJSON(); break;
    case 'export-csv': exportCSV(); break;
    case 'import': $('#import-file').click(); break;
    case 'sample': loadSample(); break;
    case 'clear-all': clearAll(); break;
    case 'signin': openSignIn(); break;
    case 'signout': doSignOut(); break;
    case 'sync-now': sync.syncNow(); break;
    case 'delete-account': doDeleteAccount(); break;
  }
});

document.addEventListener('keydown', ev => {
  const t = ev.target;
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable;

  if (modalOpen()) {
    if (ev.key === 'Escape') { ev.preventDefault(); closeModal(); }
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      const form = $('#modal-root form');
      if (form) { ev.preventDefault(); form.requestSubmit(); }
    }
    return;
  }
  if (typing) {
    if (ev.key === 'Escape') t.blur();
    return;
  }
  if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

  const r = state.review;
  if (state.route === 'review' && r && !r.finished) {
    if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); if (!r.flipped) { r.flipped = true; renderSession(); } else gradeCurrent(2); return; }
    if (r.flipped && ['1', '2', '3', '4'].includes(ev.key)) { gradeCurrent(+ev.key - 1); return; }
    if (ev.key === 'p' || ev.key === 'P') { const e = findEntry(r.queue[r.idx]); if (e) speak(e.text); return; }
  }
  if (ev.key === 'n' || ev.key === 'N') { ev.preventDefault(); openEntryForm(); return; }
  if (ev.key === '/') {
    ev.preventDefault();
    if (state.route !== 'library') { location.hash = '#/library'; }
    setTimeout(() => $('#q')?.focus(), 30);
  }
});

window.addEventListener('hashchange', () => { closeModal(); render(); });
if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { if (state.route === 'settings') viewSettings(); };
window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => applyTheme());

/* =====================================================================
   Boot
   ===================================================================== */
(async function init() {
  applyTheme();
  try {
    state.entries = (await db.all()).map(e => normalize(e)).filter(Boolean);
  } catch (err) {
    console.error(err);
    toast('Couldn’t open local storage (private browsing mode?)');
  }
  render();

  sync.init({
    allIds: () => state.entries.map(e => e.id),
    get: findEntry,
    applyRemote,
    clearLocal: async () => {
      await db.clear();
      state.entries = [];
      state.review = null;
      state.filters = defaultFilters();
      render();
    },
    onStatus: onSyncStatus,
    onMessage: msg => toast(msg),
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
