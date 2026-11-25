import { db } from './db.js';
import { newSrs, grade, previewInterval, statusOf, isDue, DAY } from './srs.js';
import * as sync from './sync.js';
import { t, getLang, setLang, locale, LANGS } from './i18n.js';

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

const TYPE_KEYS = ['word', 'phrase', 'sentence'];
const isType = k => TYPE_KEYS.includes(k);
const typeLabel = k => t('type.' + k);
const STATUS_KEYS = ['new', 'learning', 'mastered'];
const statusLabel = k => t('status.' + k);

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
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

function detectType(text) {
  const s = text.trim();
  if (!s) return 'word';
  const words = s.split(/\s+/).length;
  if (words === 1) return 'word';
  // Ends with punctuation, or capitalised and fairly long, or very long → sentence. Otherwise a phrase.
  if (/[.?!…]["'”’)]?$/.test(s) || (/^[A-Z]/.test(s) && words >= 4) || words > 10) return 'sentence';
  return 'phrase';
}

function startOfDay(ts = Date.now()) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function dayKey(ts) { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }
function fmtDate(ts, withYear) {
  return new Date(ts).toLocaleDateString(locale(), { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });
}
function relTime(ts) {
  const diff = Date.now() - ts;
  const m = 60000, h = 3600000;
  if (diff < m) return t('time.justNow');
  if (diff < h) return t('time.minAgo', Math.floor(diff / m));
  if (ts >= startOfDay()) return t('time.hAgo', Math.floor(diff / h));
  if (ts >= startOfDay() - DAY) return t('time.yesterday');
  if (diff < 7 * DAY) return t('time.daysAgo', Math.ceil((startOfDay() - ts) / DAY));
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
  { theme: 'system', rate: 0.95, voice: '', lastMovie: '', keepAdding: false, lang: getLang() },
  (() => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; } })()
);
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* ignore */ } }
function applyTheme() {
  const root = document.documentElement;
  if (settings.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', settings.theme);
}
function applyLanguage(l) {
  settings.lang = l;
  saveSettings();
  setLang(l);
  applyStaticText();
  closeModal();
  render();
}
function applyStaticText() {
  $('#brand-sub').textContent = t('brand.sub');
  $('#side-new').textContent = t('btn.newEntry');
  $('.fab')?.setAttribute('aria-label', t('btn.newEntry'));
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
  for (const e of state.entries) for (const tg of e.tags || []) map.set(tg, (map.get(tg) || 0) + 1);
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
    type: isType(raw.type) ? raw.type : detectType(text),
    meaning: String(raw.meaning ?? '').trim(),
    phonetic: String(raw.phonetic ?? '').trim(),
    movie: String(raw.movie ?? '').trim(),
    time: String(raw.time ?? '').trim(),
    context: String(raw.context ?? '').trim(),
    notes: String(raw.notes ?? '').trim(),
    tags: [...new Set(tags.map(x => String(x).trim().replace(/^#/, '')).filter(Boolean))],
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
  if (!('speechSynthesis' in window)) return toast(t('toast.noSpeech'));
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
const closeBtn = () => `<button type="button" class="icon-btn" data-close aria-label="${t('common.close')}">${icon('x')}</button>`;

function confirmDialog({ title, body, ok = t('common.ok'), danger = false }) {
  return new Promise(resolve => {
    let result = false;
    const m = openModal(`
      <div class="modal-head"><h2>${esc(title)}</h2>${closeBtn()}</div>
      <div class="modal-body"><p>${body}</p></div>
      <div class="modal-foot"><span class="left"></span>
        <button class="btn" data-close>${t('common.cancel')}</button>
        <button class="btn ${danger ? 'danger solid' : 'primary'}" data-ok>${esc(ok)}</button>
      </div>`, { size: 'sm', onClose: () => resolve(result) });
    const okBtn = $('[data-ok]', m);
    okBtn.onclick = () => { result = true; closeModal(); };
    okBtn.focus();
  });
}

function promptDialog({ title, label, value = '', ok = t('common.save') }) {
  return new Promise(resolve => {
    let result = null;
    const m = openModal(`
      <form>
        <div class="modal-head"><h2>${esc(title)}</h2>${closeBtn()}</div>
        <div class="modal-body"><div class="field"><label>${esc(label)}</label><input class="input" name="v" value="${esc(value)}" required></div></div>
        <div class="modal-foot"><span class="left"></span><button type="button" class="btn" data-close>${t('common.cancel')}</button><button class="btn primary">${esc(ok)}</button></div>
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
  toast(t('toast.deleted', trunc(e.text)), {
    action: t('toast.undo'),
    onAction: async () => { await upsert(e); render(); toast(t('toast.restored')); },
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
  const slug = encodeURIComponent(text.trim().toLowerCase().replace(/\s+/g, '-'));
  const link = (href, label, title = '') => `<a href="${href}" target="_blank" rel="noopener"${title ? ` title="${esc(title)}"` : ''}>${label} ${icon('external')}</a>`;
  const yg = link(`https://youglish.com/pronounce/${w}/english`, 'YouGlish', t('lookup.ytitle'));
  if (getLang() === 'zh') {
    return link(`https://dict.youdao.com/result?word=${w}&lang=en`, '有道')
      + link(`https://dictionary.cambridge.org/dictionary/english-chinese-simplified/${slug}`, '剑桥')
      + yg;
  }
  return link(`https://dictionary.cambridge.org/dictionary/english/${slug}`, 'Cambridge')
    + link(`https://www.merriam-webster.com/dictionary/${w}`, 'Merriam-Webster')
    + yg;
}

function openEntryForm(existing = null, preset = {}) {
  const e = existing || { movie: preset.movie ?? settings.lastMovie ?? '', type: 'word', tags: [] };
  const editing = !!existing;
  let type = e.type || 'word';
  let typeTouched = editing;
  const movies = movieList().map(m => m.name);
  const tags = tagList().map(x => x[0]);
  const opt = `<span class="opt">${t('form.optional')}</span>`;

  const m = openModal(`
    <form id="entry-form" autocomplete="off">
      <div class="modal-head"><h2>${editing ? t('form.titleEdit') : t('form.titleNew')}</h2>${closeBtn()}</div>
      <div class="modal-body">
        <div class="field main-input">
          <textarea name="text" rows="1" placeholder="${esc(t('form.textPh'))}" required>${esc(e.text)}</textarea>
        </div>
        <div class="type-row">
          <div class="seg" id="type-seg">
            ${TYPE_KEYS.map(k => `<button type="button" data-v="${k}" class="${type === k ? 'on' : ''}">${typeLabel(k)}</button>`).join('')}
          </div>
          <span class="hint" id="type-hint">${typeTouched ? '' : t('form.auto')}</span>
          <button type="button" class="btn sm" id="lookup-btn">${icon('zap')}${t('form.lookup')}</button>
          <div class="ext" id="ext-links">${dictLinks(e.text || '')}</div>
        </div>
        <div id="lookup-box"></div>
        <div class="grid2 r">
          <div class="field"><label>${t('form.meaning')}</label><input class="input" name="meaning" value="${esc(e.meaning)}" placeholder="${esc(t('form.meaningPh'))}"></div>
          <div class="field"><label>${t('form.phonetic')} ${opt}</label><input class="input" name="phonetic" value="${esc(e.phonetic)}" placeholder="/ˈeksəmpəl/"></div>
        </div>
        <div class="grid2 r">
          <div class="field"><label>${icon('film')}${t('form.movie')}</label>
            <input class="input" name="movie" list="movie-options" value="${esc(e.movie)}" placeholder="${esc(t('form.moviePh'))}">
            <datalist id="movie-options">${movies.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
          </div>
          <div class="field"><label>${icon('clock')}${t('form.time')} ${opt}</label><input class="input" name="time" value="${esc(e.time)}" placeholder="01:23:45" inputmode="numeric"></div>
        </div>
        <div class="field"><label>${t('form.context')} ${opt}</label><textarea class="textarea" name="context" rows="2" placeholder="${esc(t('form.contextPh'))}">${esc(e.context)}</textarea></div>
        <div class="field"><label>${t('form.notes')} ${opt}</label><textarea class="textarea" name="notes" rows="2" placeholder="${esc(t('form.notesPh'))}">${esc(e.notes)}</textarea></div>
        <div class="field"><label>${t('form.tags')} <span class="opt">${t('form.tagsHint')}</span></label>
          <input class="input" name="tags" list="tag-options" value="${esc((e.tags || []).join(', '))}" placeholder="${esc(t('form.tagsPh'))}">
          <datalist id="tag-options">${tags.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
        </div>
      </div>
      <div class="modal-foot">
        <div class="left">
          ${editing
            ? `<button type="button" class="btn ghost danger sm" id="del-btn">${icon('trash')}${t('common.delete')}</button>`
            : `<label class="check"><input type="checkbox" id="keep" ${settings.keepAdding ? 'checked' : ''}>${t('form.keepAdding')}</label>`}
          <span class="hide-mobile"><kbd>⌘</kbd> <kbd>↵</kbd> ${t('form.toSave')}</span>
        </div>
        <button type="button" class="btn" data-close>${t('common.cancel')}</button>
        <button type="submit" class="btn primary">${t('common.save')}</button>
      </div>
    </form>`);

  const form = $('#entry-form', m);
  const textEl = form.text;
  const seg = $('#type-seg', m);
  const hint = $('#type-hint', m);
  const ext = $('#ext-links', m);

  const autosize = () => { textEl.style.height = 'auto'; textEl.style.height = textEl.scrollHeight + 'px'; };
  const setType = k => { type = k; $$('button', seg).forEach(b => b.classList.toggle('on', b.dataset.v === k)); };
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
    toast(editing ? t('toast.updated') : dup ? t('toast.savedDup') : t('toast.saved'));

    if (!editing && settings.keepAdding) {
      ['text', 'meaning', 'phonetic', 'time', 'context', 'notes'].forEach(k => { form[k].value = ''; });
      $('#lookup-box', m).innerHTML = '';
      ext.innerHTML = '';
      typeTouched = false; hint.textContent = t('form.auto'); setType('word');
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
  if (!word) { box.innerHTML = `<div class="lookup err">${t('lookup.empty')}</div>`; return; }
  if (word.split(/\s+/).length > 4) { box.innerHTML = `<div class="lookup err">${t('lookup.sentence')}</div>`; return; }
  box.innerHTML = `<div class="lookup loading">${t('lookup.loading')}</div>`;
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
      <div class="small muted" style="margin-top:6px">${t('lookup.hint')}</div>
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
    box.innerHTML = `<div class="lookup err">${t('lookup.fail')}</div>`;
  }
}

/* =====================================================================
   Navigation
   ===================================================================== */
const ROUTES = [
  { id: 'library', icon: 'book' },
  { id: 'movies', icon: 'film' },
  { id: 'review', icon: 'layers' },
  { id: 'stats', icon: 'chart' },
  { id: 'settings', icon: 'sliders' },
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
    `<a href="#/${r.id}" class="${state.route === r.id ? 'active' : ''}">${icon(r.icon)}${t('nav.' + r.id)}${extra[r.id] || ''}</a>`).join('');
  $('#tabbar').innerHTML = ROUTES.map(r =>
    `<a href="#/${r.id}" class="${state.route === r.id ? 'active' : ''}">${icon(r.icon)}<span>${t('nav.' + r.id)}</span>${r.id === 'review' && due ? `<span class="dot">${due > 99 ? '99+' : due}</span>` : ''}</a>`).join('');
  renderSidebarFoot();
}

function renderSidebarFoot() {
  const s = streak();
  const other = getLang() === 'zh' ? 'en' : 'zh';
  $('#sidebar-foot').innerHTML = (state.entries.length
    ? `<div class="streak">${t('streak', s)} ${s >= 3 ? '🔥' : ''}</div>`
    : '') + accountWidget()
    + `<button class="lang-switch" data-action="lang" data-lang="${other}">${icon('globe')}${LANGS[other]}</button>`;
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
   Account & sync UI
   ===================================================================== */
function syncLabel(s) {
  switch (s.status) {
    case 'loading': return t('sync.loading');
    case 'syncing': return t('sync.syncing');
    case 'synced': return t('sync.synced', s.lastSyncedAt ? relTime(s.lastSyncedAt) : '');
    case 'offline': return t('sync.offline');
    case 'error': return t('sync.error');
    default: return '';
  }
}

function accountWidget() {
  if (!sync.enabled) return '';
  const s = sync.getStatus();
  if (!sync.getUser()) {
    return `<button class="account" data-action="signin">${icon('cloud')}<span><b>${t('account.signIn')}</b><small>${esc(t('account.signInSub'))}</small></span></button>`;
  }
  return `<a class="account" href="#/settings"><i class="sync-dot ${s.status}"></i><span><b>${esc(s.email)}</b><small>${syncLabel(s)}</small></span></a>`;
}

const signInFormHTML = () => `
  <form class="signin-form" data-signin novalidate>
    <input class="input" type="email" name="email" required placeholder="${t('signin.ph')}" autocomplete="email">
    <button class="btn primary">${t('signin.send')}</button>
  </form>
  <p class="small muted signin-msg">${t('signin.hint')}</p>
  <p class="small muted" style="margin:4px 0 0">${t('signin.agree')}</p>`;

function accountPanelHTML() {
  if (!sync.enabled) return '';
  const u = sync.getUser();
  const s = sync.getStatus();
  if (!u) {
    return `<section class="panel" id="account-panel">
      <h3>${t('account.panel')}</h3>
      <div class="setting"><div class="txt"><b>${t('account.signIn')}</b><span>${t('account.panelDesc')}</span></div></div>
      ${signInFormHTML()}
    </section>`;
  }
  return `<section class="panel" id="account-panel">
    <h3>${t('account.panel')}</h3>
    <div class="setting">
      <div class="txt"><b>${esc(u.email)}</b>
        <span><i class="sync-dot ${s.status}"></i>${syncLabel(s)}${s.status === 'error' && s.lastError ? ` (${esc(s.lastError)})` : ''}${s.pending ? ` · ${t('sync.pending', s.pending)}` : ''}</span>
      </div>
      <div class="ctrl">
        <button class="btn sm" data-action="sync-now">${icon('rotate')}${t('account.syncNow')}</button>
        <button class="btn sm" data-action="signout">${t('account.signOut')}</button>
      </div>
    </div>
    <div class="setting">
      <div class="txt"><b>${t('account.delete')}</b><span>${t('account.deleteDesc')}</span></div>
      <div class="ctrl"><button class="btn sm danger" data-action="delete-account">${icon('trash')}${t('account.delete')}</button></div>
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
    <div class="modal-head"><h2>${t('account.signIn')}</h2>${closeBtn()}</div>
    <div class="modal-body">
      <p>${t('signin.modalBody')}</p>
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
  if (!/^\S+@\S+\.\S+$/.test(email)) { msg.textContent = t('signin.invalid'); form.email.focus(); return; }
  const btn = form.querySelector('button');
  btn.disabled = true; btn.textContent = t('signin.sending');
  try {
    await sync.sendLink(email);
    form.outerHTML = `<div class="lookup">${t('signin.check', esc(email))}</div>`;
    msg.textContent = t('signin.didntGet');
  } catch (e) {
    btn.disabled = false; btn.textContent = t('signin.send');
    msg.textContent = t('signin.fail', e.message || t('error.unknown'));
  }
});

async function doSignOut() {
  const ok = await confirmDialog({ title: t('signout.title'), body: t('signout.body'), ok: t('account.signOut') });
  if (!ok) return;
  let r = await sync.signOut();
  if (!r.ok) {
    const force = await confirmDialog({
      title: t('signout.unsyncedTitle'), body: t('signout.unsyncedBody', r.unsynced),
      ok: t('signout.anyway'), danger: true,
    });
    if (!force) return;
    r = await sync.signOut({ force: true });
  }
  toast(t('toast.signedOut'));
}

async function doDeleteAccount() {
  const ok = await confirmDialog({ title: t('delacc.title'), body: t('delacc.body'), ok: t('account.delete'), danger: true });
  if (!ok) return;
  try {
    await sync.deleteAccount();
    toast(t('toast.accountDeleted'));
  } catch (e) {
    toast(t('toast.deleteFail', e.message || t('error.unknown')));
  }
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
      <header class="page-head"><div><h1>${t('nav.library')}</h1><p class="sub">${t('library.emptySub')}</p></div></header>
      <div class="empty-state">
        <div class="art">🎬</div>
        <h2>${t('library.emptyTitle')}</h2>
        <p>${t('library.emptyBody')}</p>
        <div class="row">
          <button class="btn primary lg" data-action="new">${icon('plus')}${t('library.addFirst')}</button>
          <button class="btn lg" data-action="sample">${t('library.loadSample')}</button>
        </div>
      </div>`;
    return;
  }

  const movieOpts = movies.map(m => m.name);
  if (f.movie && !movieOpts.includes(f.movie)) movieOpts.unshift(f.movie);
  const tagOpts = tags.map(x => x[0]);
  if (f.tag && !tagOpts.includes(f.tag)) tagOpts.unshift(f.tag);

  main.innerHTML = `
    <header class="page-head">
      <div><h1>${t('nav.library')}</h1><p class="sub">${t('library.sub', state.entries.length, movies.length)}</p></div>
      <button class="btn primary hide-mobile" data-action="new">${icon('plus')}${t('btn.newEntry')} <kbd>N</kbd></button>
    </header>
    <div class="toolbar">
      <label class="search">${icon('search')}
        <input id="q" type="search" placeholder="${esc(t('library.searchPh'))}" value="${esc(f.q)}" autocomplete="off">
        <kbd class="hide-mobile">/</kbd>
      </label>
      <div class="filters">
        <div class="seg" id="type-filter">
          ${['all', ...TYPE_KEYS].map(k => `<button data-v="${k}" class="${f.type === k ? 'on' : ''}">${k === 'all' ? t('filter.all') : t('types.' + k)}</button>`).join('')}
        </div>
        <select class="select ${f.movie ? 'active' : ''}" id="f-movie">
          <option value="">${t('filter.allTitles')}</option>
          ${movieOpts.map(n => `<option value="${esc(n)}" ${n === f.movie ? 'selected' : ''}>${esc(trunc(n, 28))}</option>`).join('')}
        </select>
        ${tagOpts.length ? `<select class="select ${f.tag ? 'active' : ''}" id="f-tag">
          <option value="">${t('filter.allTags')}</option>
          ${tagOpts.map(x => `<option value="${esc(x)}" ${x === f.tag ? 'selected' : ''}>#${esc(x)}</option>`).join('')}
        </select>` : ''}
        <select class="select ${f.status !== 'all' ? 'active' : ''}" id="f-status">
          ${[['all', t('filter.anyStatus')], ['starred', t('filter.starred')], ...STATUS_KEYS.map(k => [k, statusLabel(k)])].map(([v, l]) => `<option value="${v}" ${v === f.status ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <span class="spacer"></span>
        <select class="select" id="f-sort">
          ${['newest', 'oldest', 'az', 'due', 'movie'].map(v => `<option value="${v}" ${v === f.sort ? 'selected' : ''}>${t('sort.' + v)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="list"></div>`;

  const q = $('#q');
  let timer;
  q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { f.q = q.value; renderList(); }, 120); });
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
    if (STATUS_KEYS.includes(f.status) && statusOf(e.srs) !== f.status) return false;
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
  const s = text.trim();
  if (!s || s.length > 120) return c;
  const re = new RegExp(escRe(esc(s)), 'gi');
  return c.replace(re, m => `<mark>${m}</mark>`);
}

function cardHTML(e, i = 0) {
  const st = statusOf(e.srs);
  return `
  <article class="card" data-type="${e.type}" data-id="${e.id}" style="animation-delay:${Math.min(i, 12) * 25}ms">
    <div class="card-top">
      <span class="type-badge ${e.type}">${typeLabel(e.type)}</span>
      <span class="status ${st}">${statusLabel(st)}</span>
      <div class="actions">
        <button class="icon-btn" data-action="speak" title="${t('card.speak')}">${icon('volume')}</button>
        <button class="icon-btn ${e.starred ? 'on' : ''}" data-action="star" title="${t('card.star')}">${icon('star')}</button>
        <button class="icon-btn danger" data-action="delete" title="${t('common.delete')}">${icon('trash')}</button>
      </div>
    </div>
    <h3 class="headword">${esc(e.text)}${e.phonetic ? `<span class="phonetic">${esc(e.phonetic)}</span>` : ''}</h3>
    ${e.meaning ? `<p class="meaning">${esc(e.meaning)}</p>` : `<p class="meaning empty">${t('card.noMeaning')}</p>`}
    ${e.context ? `<p class="context">${highlight(e.context, e.text)}</p>` : ''}
    ${e.notes ? `<p class="notes">${esc(e.notes)}</p>` : ''}
    ${e.tags?.length ? `<div class="tags">${e.tags.map(x => `<button class="tag" data-action="tag" data-tag="${esc(x)}">#${esc(x)}</button>`).join('')}</div>` : ''}
    <div class="card-foot">
      ${e.movie ? `<button class="movie" data-action="movie" data-movie="${esc(e.movie)}">${icon('film')}<span>${esc(e.movie)}</span></button>` : `<span>${t('card.noTitle')}</span>`}
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
    ? `<div class="result-line">${t('results', list.length)} <button class="link" data-action="clear-filters">${t('clearFilters')}</button></div>`
    : '';
  if (!list.length) {
    box.innerHTML = line + `<div class="empty-state"><div class="art">🔍</div><h2>${t('noMatch.title')}</h2><p>${t('noMatch.body')}</p>
      <div class="row"><button class="btn" data-action="clear-filters">${t('clearFilters')}</button></div></div>`;
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
  $('#main').innerHTML = `
    <header class="page-head">
      <div><h1>${t('nav.movies')}</h1><p class="sub">${t('movies.sub', movies.length, untagged)}</p></div>
      <div class="legend">${TYPE_KEYS.map(k => `<span><i style="background:var(--${k})"></i>${t('types.' + k)}</span>`).join('')}</div>
    </header>
    ${movies.length ? `<div class="movie-grid">${movies.map((m, i) => `
      <div class="movie-card" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <button class="icon-btn" data-action="rename-movie" data-movie="${esc(m.name)}" title="${t('movies.rename')}">${icon('edit')}</button>
        <a href="#/library?movie=${encodeURIComponent(m.name)}" class="cover" style="--h:${hue(m.name)}">
          <span class="initial">${initialOf(m.name)}</span>
          <span class="title">${esc(m.name)}</span>
          <span class="count">${t('count.entries', m.count)} · ${relTime(m.last)}</span>
        </a>
        <div class="movie-meta">
          <div class="mini-bar" title="${esc(t('movies.mix', m.word, m.phrase, m.sentence))}">
            <span style="flex:${m.word}"></span><span style="flex:${m.phrase}"></span><span style="flex:${m.sentence}"></span>
          </div>
          <button class="btn sm ghost" data-action="add-to-movie" data-movie="${esc(m.name)}" title="${esc(t('movies.addFor'))}">${icon('plus')}</button>
        </div>
      </div>`).join('')}</div>`
    : `<div class="empty-state"><div class="art">🍿</div><h2>${t('movies.emptyTitle')}</h2><p>${t('movies.emptyBody')}</p>
       <div class="row"><button class="btn primary" data-action="new">${icon('plus')}${t('btn.newEntry')}</button></div></div>`}`;
}

async function renameMovie(oldName) {
  const name = await promptDialog({ title: t('movies.renameTitle'), label: t('movies.renameLabel'), value: oldName });
  if (!name || name === oldName) return;
  const changed = state.entries.filter(e => e.movie === oldName).map(e => ({ ...e, movie: name, updatedAt: Date.now() }));
  await db.putMany(changed);
  sync.trackPut(changed.map(c => c.id));
  changed.forEach(c => { const i = state.entries.findIndex(e => e.id === c.id); state.entries[i] = c; });
  if (settings.lastMovie === oldName) { settings.lastMovie = name; saveSettings(); }
  if (state.filters.movie === oldName) state.filters.movie = name;
  render();
  toast(t('toast.updatedN', changed.length));
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
    <header class="page-head"><div><h1>${t('nav.review')}</h1><p class="sub">${t('review.sub')}</p></div></header>
    ${!state.entries.length ? `<div class="empty-state"><div class="art">🃏</div><h2>${t('review.emptyTitle')}</h2><p>${t('review.emptyBody')}</p><div class="row"><button class="btn primary" data-action="new">${icon('plus')}${t('btn.newEntry')}</button></div></div>` : `
    <div class="review-start">
      <div class="panel">
        <h3>${t('review.dueToday')}</h3>
        <div class="hero-num">${due.length}</div>
        <p>${due.length ? t('review.dueDesc', newCount, due.length - newCount) : t('review.allDone')}</p>
        <div class="btn-row">
          <button class="btn primary lg" data-action="start-review" ${due.length ? '' : 'disabled'}>${t('review.start')}</button>
          <button class="btn lg" data-action="start-practice" ${total ? '' : 'disabled'}>${icon('rotate')}${t('review.practice', Math.min(20, total))}</button>
        </div>
      </div>
      <div class="panel">
        <h3>${t('review.options')}</h3>
        <div class="opt-row">
          <label for="r-scope">${t('review.scope')}</label>
          <select class="select" id="r-scope">
            <option value="">${t('review.allTitlesDue', dueList().length)}</option>
            ${movies.map(m => `<option value="${esc(m.name)}" ${m.name === p.scope ? 'selected' : ''}>${esc(trunc(m.name, 30))} (${m.due})</option>`).join('')}
          </select>
        </div>
        <div class="opt-row">
          <label>${t('review.direction')}</label>
          <div class="seg" id="r-dir">
            <button data-v="forward" class="${p.dir === 'forward' ? 'on' : ''}">${t('review.forward')}</button>
            <button data-v="reverse" class="${p.dir === 'reverse' ? 'on' : ''}">${t('review.reverse')}</button>
          </div>
        </div>
        <p class="small muted" style="margin:0">${t('review.shortcuts')}</p>
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
  if (!ids.length) return toast(t('review.noMeaning'));
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
  const noMeaning = `<p class="meaning empty">${t('card.noMeaning')}</p>`;
  const front = reverse
    ? `<p class="big cn">${esc(e.meaning)}</p>${masked ? `<p class="context">${masked}</p>` : ''}`
    : `<p class="big ${e.type === 'sentence' ? 'sentence' : ''}">${esc(e.text)}</p>${e.phonetic ? `<div class="phonetic">${esc(e.phonetic)}</div>` : ''}${e.context ? `<p class="context">${highlight(e.context, e.text)}</p>` : ''}`;
  const back = reverse
    ? `<p class="big ${e.type === 'sentence' ? 'sentence' : ''}" style="font-size:clamp(22px,4vw,32px)">${esc(e.text)}</p>${e.phonetic ? `<div class="phonetic">${esc(e.phonetic)}</div>` : ''}${e.notes ? `<p class="notes">${esc(e.notes)}</p>` : ''}`
    : `${e.meaning ? `<p class="meaning">${esc(e.meaning)}</p>` : noMeaning}${e.notes ? `<p class="notes">${esc(e.notes)}</p>` : ''}`;

  const pct = Math.round((r.idx / r.queue.length) * 100);

  $('#main').innerHTML = `
    <div class="session">
      <div class="session-top">
        <button class="btn ghost sm" data-action="end-review">${icon('x')}${t('review.end')}</button>
        <div class="progress"><span style="width:${pct}%"></span></div>
        <span class="num">${r.idx + 1} / ${r.queue.length}</span>
      </div>
      <div class="flash" data-type="${e.type}">
        <span class="type-badge ${e.type}">${typeLabel(e.type)}${r.practice ? ` · ${t('review.practiceTag')}` : ''}</span>
        <button class="icon-btn speak" data-action="speak-current" title="${t('card.speak')} (P)">${icon('volume')}</button>
        ${front}
        ${e.movie ? `<span class="src">${icon('film')}${esc(e.movie)}${e.time ? ` · ${esc(e.time)}` : ''}</span>` : ''}
        ${r.flipped ? `<div class="answer">${back}</div>` : ''}
      </div>
      ${r.flipped
        ? `<div class="grades">${[0, 1, 2, 3].map(q => `<button class="grade g${q}" data-action="grade" data-q="${q}">${t('grade.' + q)}<small>${r.practice ? '&nbsp;' : previewInterval(e.srs, q)}</small><kbd>${q + 1}</kbd></button>`).join('')}</div>`
        : `<button class="btn primary lg reveal" data-action="flip">${t('review.showAnswer')} <kbd>${t('key.space')}</kbd></button>`}
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
  const colors = ['var(--danger)', 'var(--star)', 'var(--ok)', 'var(--word)'];
  $('#main').innerHTML = `
    <div class="summary">
      <div class="art">${rate >= 80 ? '🏆' : rate >= 50 ? '💪' : '🌱'}</div>
      <h2>${r.practice ? t('summary.practiceDone') : t('summary.reviewDone')}</h2>
      <p class="muted">${t('summary.line', r.unique.size, rate)}</p>
      <div class="summary-stats">
        ${r.counts.map((n, q) => `<div><b style="color:${colors[q]}">${n}</b><span>${t('grade.' + q)}</span></div>`).join('')}
      </div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn primary lg" data-action="end-review">${t('summary.done')}</button>
        <a class="btn lg" href="#/stats">${t('summary.viewStats')}</a>
      </div>
    </div>`;
}

/* =====================================================================
   View: Stats
   ===================================================================== */
function viewStats() {
  const E = state.entries;
  if (!E.length) {
    $('#main').innerHTML = `<header class="page-head"><div><h1>${t('nav.stats')}</h1></div></header>
      <div class="empty-state"><div class="art">📈</div><h2>${t('stats.emptyTitle')}</h2><p>${t('stats.emptyBody')}</p></div>`;
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
    cells.push(`<i class="${future ? 'future' : lv ? 'l' + lv : ''}" title="${esc(t('heat.cell', fmtDate(d.getTime()), n))}"></i>`);
  }
  const s = streak();
  const unit = t('kpi.unit');
  const pct = n => Math.round((n / E.length) * 100);
  const statusColors = { new: 'var(--faint)', learning: 'var(--star)', mastered: 'var(--ok)' };

  $('#main').innerHTML = `
    <header class="page-head"><div><h1>${t('nav.stats')}</h1><p class="sub">${t('stats.since', fmtDate(Math.min(...E.map(e => e.createdAt)), true), perDay.size)}</p></div></header>
    <div class="kpis">
      <div class="kpi"><div class="label">${t('kpi.total')}</div><div class="value">${E.length}${unit ? `<small>${unit}</small>` : ''}</div><div class="hint">${t('count.titles', movieList().length)}</div></div>
      <div class="kpi"><div class="label">${t('kpi.last7')}</div><div class="value">${thisWeek}${unit ? `<small>${unit}</small>` : ''}</div><div class="hint">${t('kpi.perDay', (thisWeek / 7).toFixed(1))}</div></div>
      <div class="kpi"><div class="label">${t('kpi.streak')}</div><div class="value">${s}<small>${t('kpi.daysUnit', s)}</small></div><div class="hint">${s >= 3 ? t('kpi.keepGoing') : t('kpi.oneADay')}</div></div>
      <div class="kpi"><div class="label">${t('kpi.mastered')}</div><div class="value">${st.mastered}${unit ? `<small>${unit}</small>` : ''}</div><div class="hint">${t('kpi.mix', st.learning, st.new)}</div></div>
    </div>
    <div class="stats-grid">
      <div class="panel wide">
        <h3>${t('stats.activity', WEEKS)}</h3>
        <div class="heat-wrap"><div class="heatmap">${cells.join('')}</div></div>
        <div class="heat-legend">${t('stats.less')}<span></span><i style="background:var(--heat-0)"></i><i style="background:color-mix(in srgb,var(--accent) 30%,var(--heat-0))"></i><i style="background:color-mix(in srgb,var(--accent) 55%,var(--heat-0))"></i><i style="background:color-mix(in srgb,var(--accent) 80%,var(--heat-0))"></i><i style="background:var(--accent)"></i><span></span>${t('stats.more')}</div>
      </div>
      <div class="panel">
        <h3>${t('stats.byType')}</h3>
        <div class="stack">${TYPE_KEYS.map(k => `<span style="flex:${byType[k]}"></span>`).join('')}</div>
        <div class="dist-list">
          ${TYPE_KEYS.map(k => `<div><i style="background:var(--${k})"></i>${t('types.' + k)}<b>${byType[k]}</b><small>${pct(byType[k])}%</small></div>`).join('')}
        </div>
        <h3 style="margin-top:22px">${t('stats.progress')}</h3>
        <div class="dist-list">
          ${STATUS_KEYS.map(k => `<div><i style="background:${statusColors[k]}"></i>${k === 'mastered' ? t('stats.masteredLong') : statusLabel(k)}<b>${st[k]}</b><small>${pct(st[k])}%</small></div>`).join('')}
        </div>
      </div>
      <div class="panel">
        <h3>${t('stats.topTitles')}</h3>
        ${movies.length ? `<div class="bars">${movies.map(m => `
          <a class="bar-row" href="#/library?movie=${encodeURIComponent(m.name)}"><span class="name" title="${esc(m.name)}">${esc(m.name)}</span><span class="track"><span style="width:${(m.count / maxMovie) * 100}%"></span></span><b>${m.count}</b></a>`).join('')}</div>`
        : `<p class="muted small">${t('stats.noTitles')}</p>`}
        ${tags.length ? `<h3 style="margin-top:22px">${t('stats.topTags')}</h3><div class="tags">${tags.map(([x, n]) => `<a class="tag" href="#/library?tag=${encodeURIComponent(x)}">#${esc(x)} <span class="muted">${n}</span></a>`).join('')}</div>` : ''}
      </div>
    </div>`;
}

/* =====================================================================
   View: Settings
   ===================================================================== */
function viewSettings() {
  const voices = englishVoices();
  const lang = getLang();
  $('#main').innerHTML = `
    <header class="page-head"><div><h1>${t('nav.settings')}</h1><p class="sub">${sync.getUser() ? t('settings.subSynced') : t('settings.subLocal')}</p></div></header>
    <div class="settings">
      ${accountPanelHTML()}

      <section class="panel">
        <h3>${t('settings.appearance')}</h3>
        <div class="setting">
          <div class="txt"><b>${t('settings.language')}</b><span>${t('settings.languageDesc')}</span></div>
          <div class="ctrl"><div class="seg" id="s-lang">
            ${Object.entries(LANGS).map(([v, l]) => `<button data-v="${v}" class="${lang === v ? 'on' : ''}">${l}</button>`).join('')}
          </div></div>
        </div>
        <div class="setting">
          <div class="txt"><b>${t('settings.theme')}</b><span>${t('settings.themeDesc')}</span></div>
          <div class="ctrl"><div class="seg" id="s-theme">
            ${['system', 'light', 'dark'].map(v => `<button data-v="${v}" class="${settings.theme === v ? 'on' : ''}">${t('theme.' + v)}</button>`).join('')}
          </div></div>
        </div>
      </section>

      <section class="panel">
        <h3>${t('settings.speech')}</h3>
        <div class="setting">
          <div class="txt"><b>${t('settings.voice')}</b><span>${voices.length ? t('settings.voicesN', voices.length) : t('settings.voiceDefault')}</span></div>
          <div class="ctrl">
            <select class="select" id="s-voice" style="max-width:240px">
              <option value="">${t('settings.auto')}</option>
              ${voices.map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === settings.voice ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="setting">
          <div class="txt"><b>${t('settings.speed')}</b><span id="rate-label">${settings.rate.toFixed(2)}×</span></div>
          <div class="ctrl">
            <input type="range" id="s-rate" min="0.5" max="1.4" step="0.05" value="${settings.rate}">
            <button class="btn sm" id="s-test">${icon('volume')}${t('settings.test')}</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <h3>${t('settings.data')}</h3>
        <div class="setting">
          <div class="txt"><b>${t('settings.export')}</b><span>${t('settings.exportDesc')}</span></div>
          <div class="ctrl">
            <button class="btn sm" data-action="export-json">${icon('download')}JSON</button>
            <button class="btn sm" data-action="export-csv">${icon('download')}CSV</button>
          </div>
        </div>
        <div class="setting">
          <div class="txt"><b>${t('settings.import')}</b><span>${t('settings.importDesc')}</span></div>
          <div class="ctrl">
            <button class="btn sm" data-action="import">${icon('upload')}${t('settings.chooseFile')}</button>
            <input type="file" id="import-file" accept=".json,application/json" hidden>
          </div>
        </div>
        <div class="setting">
          <div class="txt"><b>${t('settings.sample')}</b><span>${t('settings.sampleDesc')}</span></div>
          <div class="ctrl"><button class="btn sm" data-action="sample">${t('settings.loadSamples')}</button></div>
        </div>
        <div class="setting">
          <div class="txt"><b>${t('settings.deleteAll')}</b><span>${t('settings.deleteAllDesc', state.entries.length)}</span></div>
          <div class="ctrl"><button class="btn sm danger" data-action="clear-all">${icon('trash')}${t('settings.deleteAllBtn')}</button></div>
        </div>
      </section>

      <section class="panel">
        <h3>${t('settings.shortcuts')}</h3>
        <dl class="shortcuts">
          <dt><kbd>N</kbd></dt><dd>${t('sc.new')}</dd>
          <dt><kbd>/</kbd></dt><dd>${t('sc.search')}</dd>
          <dt><kbd>⌘</kbd><kbd>↵</kbd></dt><dd>${t('sc.save')}</dd>
          <dt><kbd>Esc</kbd></dt><dd>${t('sc.close')}</dd>
          <dt><kbd>${t('key.space')}</kbd></dt><dd>${t('sc.flip')}</dd>
          <dt><kbd>1</kbd>–<kbd>4</kbd></dt><dd>${t('sc.grade')}</dd>
          <dt><kbd>P</kbd></dt><dd>${t('sc.read')}</dd>
        </dl>
      </section>

      <section class="panel">
        <h3>${t('settings.about')}</h3>
        <div class="setting">
          <div class="txt"><b>${t('settings.privacy')}</b><span>${t('settings.privacyDesc')}</span></div>
          <div class="ctrl"><a class="btn sm" href="privacy.html" target="_blank" rel="noopener">${t('settings.read')} ${icon('external')}</a></div>
        </div>
        <div class="setting">
          <div class="txt"><b>${t('settings.openSource')}</b><span>${t('settings.openSourceDesc')}</span></div>
          <div class="ctrl"><a class="btn sm" href="https://github.com/Wenxian-ee/reel-words" target="_blank" rel="noopener">GitHub ${icon('external')}</a></div>
        </div>
      </section>
    </div>`;

  $('#s-lang').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.dataset.v === getLang()) return;
    applyLanguage(b.dataset.v);
  });
  $('#s-theme').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    settings.theme = b.dataset.v; saveSettings(); applyTheme();
    $$('#s-theme button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#s-voice').addEventListener('change', e => { settings.voice = e.target.value; saveSettings(); speak('Hello, how are you?'); });
  $('#s-rate').addEventListener('input', e => { settings.rate = +e.target.value; $('#rate-label').textContent = settings.rate.toFixed(2) + '×'; saveSettings(); });
  $('#s-test').onclick = () => speak(t('settings.testPhrase'));
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
  toast(t('toast.exported', state.entries.length));
}
function exportCSV() {
  const cols = ['text', 'meaning', 'type', 'phonetic', 'movie', 'time', 'context', 'notes', 'tags', 'createdAt'];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = state.entries.map(e => cols.map(c =>
    c === 'tags' ? cell(e.tags.join(' ')) :
    c === 'type' ? cell(typeLabel(e.type)) :
    c === 'createdAt' ? cell(new Date(e.createdAt).toLocaleString(locale())) : cell(e[c])).join(','));
  download(`reel-words-${stamp()}.csv`, '﻿' + [t('csv.header').map(cell).join(','), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
  toast(t('toast.exported', state.entries.length));
}

async function importFile(ev) {
  const file = ev.target.files?.[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.entries;
    if (!Array.isArray(list)) throw new Error(t('import.badFormat'));
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
    toast(t('toast.importDone', added, updated));
  } catch (err) {
    toast(t('toast.importFail', err instanceof SyntaxError ? t('import.unreadable') : (err.message || t('import.unreadable'))));
  }
}

const SAMPLES = {
  en: [
    { text: "Life was like a box of chocolates. You never know what you're gonna get.", meaning: 'Life is full of surprises; you can’t predict what will happen.', movie: 'Forrest Gump', notes: 'Often quoted when talking about how unpredictable life is.', tags: ['classic line'], d: 9 },
    { text: 'gonna', meaning: 'informal for “going to”', phonetic: '/ˈɡɒnə/', movie: 'Forrest Gump', context: "You never know what you're gonna get.", notes: 'Casual speech only — avoid in formal writing. See also: wanna (want to), gotta (got to).', tags: ['casual'], d: 9 },
    { text: "an offer he can't refuse", meaning: 'a deal too good (or too threatening) to turn down', movie: 'The Godfather', context: "I'm gonna make him an offer he can't refuse.", notes: 'Now used jokingly for any irresistible offer.', tags: ['classic line', 'idiom'], d: 6 },
    { text: 'Houston, we have a problem.', meaning: 'Something has gone wrong.', movie: 'Apollo 13', notes: 'Used humorously in everyday life when something breaks.', tags: ['classic line', 'casual'], d: 4 },
    { text: 'just keep swimming', meaning: 'keep going; don’t give up', movie: 'Finding Nemo', context: 'Just keep swimming, just keep swimming.', notes: 'A light-hearted way to encourage yourself or someone else.', tags: ['encouragement'], d: 2, starred: true },
    { text: 'to infinity and beyond', meaning: 'without limits; aiming as high as possible', movie: 'Toy Story', context: 'To infinity and beyond!', tags: ['classic line'], d: 1 },
    { text: 'beyond', meaning: 'further than; outside the limits of', phonetic: '/bɪˈjɒnd/', movie: 'Toy Story', context: 'To infinity and beyond!', notes: 'beyond my control\nbeyond words', tags: [], d: 0 },
  ],
  zh: [
    { text: "Life was like a box of chocolates. You never know what you're gonna get.", meaning: '人生就像一盒巧克力，你永远不知道下一颗是什么味道。', movie: 'Forrest Gump', notes: '常用来形容人生充满未知与惊喜。', tags: ['经典台词'], d: 9 },
    { text: 'gonna', meaning: '= going to，口语中的“将要”', phonetic: '/ˈɡɒnə/', movie: 'Forrest Gump', context: "You never know what you're gonna get.", notes: '非正式口语，书面语里别用。类似的还有 wanna (want to)、gotta (got to)。', tags: ['口语'], d: 9 },
    { text: "an offer he can't refuse", meaning: '无法拒绝的条件', movie: 'The Godfather', context: "I'm gonna make him an offer he can't refuse.", notes: '现在常被幽默地用来形容“好到没法拒绝的提议”。', tags: ['经典台词', '习语'], d: 6 },
    { text: 'Houston, we have a problem.', meaning: '我们遇到麻烦了。', movie: 'Apollo 13', notes: '日常里也常拿来开玩笑：出问题了！', tags: ['经典台词', '口语'], d: 4 },
    { text: 'just keep swimming', meaning: '继续游下去；坚持下去', movie: 'Finding Nemo', context: 'Just keep swimming, just keep swimming.', notes: '给自己或别人打气时用。', tags: ['鼓励'], d: 2, starred: true },
    { text: 'to infinity and beyond', meaning: '飞向宇宙，浩瀚无垠', movie: 'Toy Story', context: 'To infinity and beyond!', notes: 'beyond：在……之外；超越', tags: ['经典台词'], d: 1 },
    { text: 'beyond', meaning: '超出；在……之外', phonetic: '/bɪˈjɒnd/', movie: 'Toy Story', context: 'To infinity and beyond!', notes: 'beyond my control 超出我的控制\nbeyond words 无法用语言形容', tags: [], d: 0 },
  ],
};

async function loadSample() {
  const now = Date.now();
  const list = SAMPLES[getLang()].map(({ d, ...r }) => {
    const ts = now - d * DAY - Math.floor(Math.random() * 3600000);
    return normalize({ ...r, createdAt: ts, updatedAt: ts });
  });
  await db.putMany(list);
  sync.trackPut(list.map(e => e.id));
  state.entries.push(...list);
  render();
  toast(t('toast.sampleAdded', list.length));
}

async function clearAll() {
  const ok = await confirmDialog({
    title: t('clear.title'),
    body: t('clear.body', state.entries.length, !!sync.getUser()),
    ok: t('settings.deleteAllBtn'), danger: true,
  });
  if (!ok) return;
  sync.trackDelete(state.entries.map(e => e.id));
  await db.clear();
  state.entries = [];
  state.review = null;
  state.filters = defaultFilters();
  render();
  toast(t('toast.cleared'));
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
  switch (el.dataset.action) {
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
    case 'lang': applyLanguage(el.dataset.lang); break;
  }
});

document.addEventListener('keydown', ev => {
  const tg = ev.target;
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tg.tagName) || tg.isContentEditable;

  if (modalOpen()) {
    if (ev.key === 'Escape') { ev.preventDefault(); closeModal(); }
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) {
      const form = $('#modal-root form');
      if (form) { ev.preventDefault(); form.requestSubmit(); }
    }
    return;
  }
  if (typing) {
    if (ev.key === 'Escape') tg.blur();
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
  setLang(settings.lang);
  applyStaticText();
  try {
    state.entries = (await db.all()).map(e => normalize(e)).filter(Boolean);
  } catch (err) {
    console.error(err);
    toast(t('toast.storageFail'));
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
