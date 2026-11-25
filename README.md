# 🎬 Reel Words

**👉 Try it: [reelwords.site](https://reelwords.site)**

Save the words, phrases and lines you hear in English movies and TV shows, then review them with spaced repetition.

Reel Words is plain HTML, CSS and JavaScript. It has no dependencies and no build step. Data is stored in the browser (IndexedDB).

## Features

- **Quick capture**: press `N` to open the entry form. It works out whether you typed a word, a phrase or a sentence, remembers the last title you used, and has a “keep adding” mode for logging several entries in a row.
- **Rich entries**: each entry can hold a meaning, pronunciation, movie or show title, timestamp, the original line (with the target word highlighted), notes and tags.
- **Dictionary lookup**: one click fetches definitions and fills in the pronunciation. There are also quick links to Cambridge, Merriam-Webster and YouGlish.
- **Text-to-speech**: entries are read aloud with your system's English voices, and you can choose the voice and speed.
- **Library**: full-text search; filter by type, title, tag or status; five sort orders; stars; undo after a delete.
- **Movie wall**: entries are grouped by title automatically, each title gets a generated poster, and titles can be renamed.
- **Review**: SM-2 spaced repetition in two directions (English → meaning or meaning → English). You can review a single title, and a free-practice mode leaves your schedule unchanged.
- **Stats**: an activity heatmap, your streak, a breakdown by type, mastery progress, top titles and top tags.
- **Data**: export JSON as a full backup, or CSV for Excel and Anki; import from JSON.
- **Bilingual UI**: English and Chinese (简体中文); follows the browser language by default and can be switched in Settings.
- **Polish**: light, dark or system theme; a mobile layout; works offline; installable as a PWA.

## Run locally

Browsers won't load ES modules from `file://`, so serve the folder with a local web server:

```bash
cd reel-words
python3 -m http.server 5173
```

Then open http://localhost:5173.

## Deploy (free) with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, open **Settings → Pages** and choose the `main` branch, root folder.
3. The app goes live at `https://<username>.github.io/<repo>/`. On a phone, choose **Add to Home Screen** to use it like an app.

> ⚠️ Each browser keeps its own data, and nothing syncs between devices. To move your data, export it on one device and import it on the other.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `N` | New entry |
| `/` | Search |
| `⌘/Ctrl + Enter` | Save |
| `Esc` | Close dialog |
| `Space` | Flip card |
| `1`–`4` | Grade card |
| `P` | Read aloud |

## Project structure

```
index.html            app shell
css/style.css         styles (light + dark themes)
js/app.js             UI and interactions
js/db.js              IndexedDB storage
js/srs.js             spaced-repetition algorithm
js/sync.js            cloud sync and accounts
js/i18n.js            UI translations (en / zh)
js/config.js          Supabase public settings
sw.js                 offline cache
manifest.webmanifest  PWA manifest
```
