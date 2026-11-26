# 🎬 Reel Words

**Save the words, phrases and lines you hear in English movies and TV shows, then review them with spaced repetition.**

### 👉 [reelwords.site](https://reelwords.site)

Free, no ads, and you don't need an account. Open the site and start adding words. Sign in with your email if you want your words synced across devices.

---

## Getting started

1. **Open [reelwords.site](https://reelwords.site)** on your computer or phone.
2. **Add an entry**: press `N` (or tap **＋** on mobile), type the word or line you just heard, and add the movie title. Reel Words works out whether it's a word, a phrase or a sentence.
3. **Review**: open the **Review** tab each day. Cards you find hard come back sooner, and cards you know well come back less often.
4. **(Optional) Sign in** under **Settings → Account & Sync** to back up your library and keep it in sync across devices. We email you a sign-in link, so there's no password to remember.
5. **(Optional) Install it**: choose **Add to Home Screen** on your phone, or click the install icon in the address bar on desktop. It then opens like an app and works offline.

## Features

- **Quick capture**: remembers the last title you used, and has a "keep adding" mode for logging several lines in a row.
- **Rich entries**: each entry can hold a meaning, pronunciation, title, timestamp, the original line (with the target word highlighted), notes and tags.
- **Dictionary lookup**: one click fetches English definitions and the pronunciation. There are also quick links to Cambridge, Merriam-Webster, Youdao and YouGlish.
- **Text-to-speech**: hear any entry read aloud, and choose the voice and speed.
- **Library**: full-text search; filter by type, title, tag or learning status; sort; star entries; undo a delete.
- **Movie wall**: entries are grouped by title automatically, and each title gets a generated poster.
- **Spaced repetition**: SM-2 based review in two directions (English → meaning, meaning → English). You can review per title, and a free-practice mode leaves your schedule unchanged.
- **Stats**: an activity heatmap, your streak, mastery progress, and your top titles and tags.
- **Accounts & cloud sync**: email sign-in, automatic sync, and it works offline (changes upload when you're back online).
- **Your data, your control**: export JSON (full backup) or CSV (for Excel and Anki), import JSON, and delete your account at any time.
- **Bilingual UI**: English and 简体中文.
- **Light and dark themes**, a mobile-friendly layout, and installable as a PWA.

## Privacy

- **Without an account**, everything stays in your browser. Nothing is sent to a server.
- **With an account**, your entries are stored in a database that only your account can read, protected by row-level security.
- No ads, no tracking, and no selling of data.

Read the full [Privacy Policy](https://reelwords.site/privacy.html).

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | New entry |
| `/` | Search |
| `⌘/Ctrl + Enter` | Save |
| `Esc` | Close dialog |
| `Space` | Flip card |
| `1`–`4` | Grade card (Again / Hard / Good / Easy) |
| `P` | Read aloud |

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/Wenxian-ee/reel-words/issues).

---

## For developers

Reel Words is plain HTML, CSS and JavaScript, with no framework and no build step.

| Part | Tech |
| --- | --- |
| Frontend | Vanilla JS (ES modules), hosted on GitHub Pages |
| Local storage | IndexedDB, offline-first |
| Accounts & sync | [Supabase](https://supabase.com) (Auth with magic links, plus Postgres with RLS) |
| Email | [Resend](https://resend.com), used as SMTP by Supabase |
| Offline / install | Service worker + web app manifest |

### Run locally

Browsers won't load ES modules from `file://`, so serve the folder with a local web server:

```bash
cd reel-words
python3 -m http.server 5173
```

Then open http://localhost:5173.

### Self-host

1. Fork this repository and enable **Settings → Pages** (branch `main`, root folder).
2. Accounts and sync are optional. If you leave `SUPABASE_URL` and `SUPABASE_KEY` empty in `js/config.js`, the app runs in local-only mode.
3. To turn on sync, create a Supabase project. Create an `entries` table with row-level security limited to `auth.uid() = user_id`, then put your project URL and **publishable** key in `js/config.js`. Never put the secret or `service_role` key in frontend code.

### Project structure

```
index.html            app shell
privacy.html          privacy policy (en / zh)
css/style.css         styles (light + dark themes)
js/app.js             UI and interactions
js/db.js              IndexedDB storage
js/srs.js             spaced-repetition algorithm
js/sync.js            accounts and cloud sync
js/i18n.js            UI translations (en / zh)
js/config.js          Supabase public settings
sw.js                 offline cache
manifest.webmanifest  PWA manifest
```

## License

[MIT](LICENSE)
