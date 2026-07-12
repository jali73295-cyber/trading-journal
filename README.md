# TradeLog Pro — Trading Journal

A **premium, private, offline-first trading journal** that runs entirely in your browser. No backend, no account, no subscription — your trades, screenshots and analytics never leave your device.

Built with pure **HTML5 + CSS3 + Vanilla JavaScript (ES6+)**, **LocalStorage** for trade data, **IndexedDB** for screenshots, **Chart.js** for analytics, and full **PWA** support. Deploys to **GitHub Pages** with zero configuration.

---

## ✨ Features

- **Dashboard** — 11 live KPI cards (total trades, wins, losses, breakeven, win rate, average RR, profit factor, current winning/losing streaks, total R, monthly R), an equity curve and recent trades.
- **Journal** — professional data table (view / edit / duplicate / delete), sortable columns, pagination, and search across **date, pair, month, year, strategy, level, buy/sell, session, timeframe, result, tags and free keyword**.
- **Calendar** — monthly P&L heatmap; click any day to see its trades.
- **Trade entry** — the full workflow: auto trade number, date/time, session, pair, direction, three timeframe fields, market structure, setup type, level, entry/SL/TP with **auto-calculated RR**, risk %, lot size, RR planned/achieved, P/L, commission, spread, result, emotions before/after, confidence slider, **customizable checklist**, mistakes, lesson, TradingView link, notes, custom tags and **five screenshot slots** (entry, exit, chart markup, before, after).
- **Trade details** — every trade opens into a rich, fully editable page with enlarged images and a clickable TradingView link.
- **Statistics** — 13 charts: win vs loss, monthly & yearly performance, pair / session / strategy / timeframe analysis, average RR (planned vs achieved), equity curve, R-multiple distribution, profit factor by month, mistake frequency, emotion analysis and per-item checklist success rate. Filter by period (all time, this year, 90/30 days, this month).
- **Gallery** — every screenshot in one place, filterable by pair, result, strategy, type and date, with a zoom + pan lightbox.
- **Settings** — dark/light theme, six accent presets + custom color, font size, currency symbol, default risk, and full editors for the checklist and every dropdown list (pairs, sessions, strategies, timeframes, levels, emotions, mistakes, tags).
- **Data safety** — export CSV, export JSON, **full backup including images**, import/restore, and a guarded reset.
- **PWA** — installable as a desktop/mobile app with an icon, splash colors and complete offline support.

---

## 🚀 Installation

There is nothing to install — it's a static site.

**Option A — just open it**
1. Download / clone this folder.
2. Double-click `index.html`.
   > Opening from `file://` works for the journal itself. The service worker (offline/PWA install) requires `http(s)`, so use Option B or C for the full experience.

**Option B — local server (recommended for development)**
```bash
cd tradelog
python3 -m http.server 8000
# then visit http://localhost:8000
```

**Option C — GitHub Pages (recommended for daily use)** — see below.

---

## 🐙 GitHub Upload

1. Create a new repository on GitHub (e.g. `trading-journal`). Public or private both work.
2. Upload the project:

```bash
cd tradelog
git init
git add .
git commit -m "TradeLog Pro v1.0.0"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/trading-journal.git
git push -u origin main
```

(Or simply drag-and-drop the files using **Add file → Upload files** on github.com.)

## 🌐 GitHub Pages Deployment

1. In your repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source: Deploy from a branch**, **Branch: `main`**, **Folder: `/ (root)`**. Save.
3. Wait ~1 minute. Your journal is live at:
   `https://YOUR-USERNAME.github.io/trading-journal/`
4. Open it once, then it works fully offline and can be **installed as an app** (browser menu → *Install TradeLog*, or the Install button in Settings → About).

No build step, no configuration files, no environment variables. All paths are relative, so it works at any repo name or sub-path.

> **Note:** your data lives in the browser you use, per device. The GitHub repo only hosts the *app*, never your trades.

---

## 📁 Project Structure

```
tradelog/
├── index.html            Journal — table, search filters, calendar
├── dashboard.html        KPI cards, equity curve, recent trades
├── trade.html            New / edit form + trade detail view (?id= / ?edit= / ?duplicate=)
├── statistics.html       13 analytics charts + period filter
├── gallery.html          Screenshot gallery + lightbox
├── settings.html         Appearance, lists, checklist, backup & data tools
├── style.css             Complete design system (dark glassmorphism + light theme)
├── script.js             Core bootstrap: icons, sidebar, theme engine, PWA, shortcuts
├── manifest.json         PWA manifest
├── service-worker.js     Offline cache (bump VERSION after editing files)
├── README.md
├── js/
│   ├── storage.js        LocalStorage data layer, settings, CSV/JSON export, demo seed
│   ├── images.js         IndexedDB screenshot store + backup helpers
│   ├── metrics.js        Pure analytics functions (no DOM)
│   ├── ui.js             Toasts, modals, confirm, lightbox, chips, formatters
│   ├── charts.js         Chart.js theming helpers
│   ├── journal.js        Journal page controller
│   ├── dashboard.js      Dashboard page controller
│   ├── trade.js          Trade form + detail controller
│   ├── statistics.js     Statistics page controller
│   ├── gallery.js        Gallery page controller
│   └── settings.js       Settings page controller
└── assets/
    ├── icons/            App icons, favicon (PNG + SVG)
    ├── images/           Free for your own assets
    └── vendor/           chart.umd.min.js (Chart.js, vendored for offline use)
```

**Architecture.** Every module attaches to a single shared namespace, `window.TJ` (`TJ.store`, `TJ.images`, `TJ.metrics`, `TJ.ui`, `TJ.charts`). Plain `<script>` tags — no bundler and no ES-module CORS issues on `file://`. Pages are thin HTML shells; controllers render into them. To add a page: copy an HTML shell, add a controller in `js/`, and register it in the `NAV` array in `script.js` and the `ASSETS` list in `service-worker.js`.

---

## 🎨 Customization

Most customization needs no code — **Settings** covers theme, accent, font size, currency, default risk, the checklist, and every dropdown list.

In code:

| What | Where |
|---|---|
| Accent presets | `PRESETS` array in `js/settings.js` |
| Default lists & checklist | `defaults()` in `js/storage.js` |
| Colors, radii, fonts | CSS variables at the top of `style.css` |
| Nav items / new pages | `NAV` in `script.js` |
| Table page size | `PAGE` in `js/journal.js` |
| Offline cache | `ASSETS` + `VERSION` in `service-worker.js` |

> After editing any file on a deployed site, **bump `VERSION` in `service-worker.js`** so installed clients pick up the update.

---

## 💾 Backup

Everything is stored locally, so backups are your safety net. In **Settings → Backup & Data**:

- **Export JSON (data)** — trades + settings, small and fast.
- **Full Backup** — one JSON file containing *everything*, screenshots included (as base64). Keep this somewhere safe (cloud drive, second disk).
- **Export CSV** — spreadsheet-ready trade list (also available filtered, from the Journal page).

Recommended habit: a **Full Backup** every week, and before clearing browser data or switching devices.

## ♻️ Restore

1. **Settings → Backup & Data → Import / Restore**.
2. Pick any exported JSON (data-only or full backup).
3. Confirm — the file **replaces** all current data. If the backup contains images, screenshots are restored into IndexedDB automatically.

Restoring also works across devices and browsers: deploy the app, open it on the new device, import your backup. Done.

---

## ⌨️ Shortcuts

- `N` — new trade (anywhere)
- `/` — focus journal search
- `Esc` — close dialogs / lightbox
- `← →` and mouse wheel — navigate / zoom inside the lightbox

## 🔒 Privacy

100% client-side. No analytics, no tracking, no network calls for your data. The only external request is the Google Fonts stylesheet (cached for offline by the service worker; the app falls back to system fonts without it).

---

## 🤖 Future Development (AI-ready)

The data layer was designed so features can be added without rewriting anything:

- **Stable, flat schema.** Every trade is a versioned (`schema: 1`) flat object — see `blank()` in `js/storage.js`. New fields can be added without migrations; older trades simply omit them.
- **Signed R-multiples** (`rrAchieved`: `+2.5`, `-1`, `0`) make results machine-readable without interpreting prices.
- **Structured psychology data** — checklist as `{itemId: boolean}`, mistakes/tags as arrays, emotions and confidence as discrete values — exactly what pattern-finding models need.
- **Pure analytics** (`js/metrics.js` has zero DOM code) can run anywhere: browser, Node, or as context for an LLM.
- **One-file export.** `TJ.store.exportData()` returns the complete journal as JSON — ready to feed an AI review ("find my most expensive recurring mistake"), a Node script, or a future sync layer.

Ideas that slot straight in: AI trade reviews on the detail page, weekly AI summaries on the dashboard, natural-language search, and image-based chart critique from the stored screenshots.

## 🧰 Troubleshooting

- **Charts/pages look stale after an update** → bump `VERSION` in `service-worker.js`, redeploy, then hard-refresh (the old cache is deleted automatically).
- **Screenshots don't save when opening via `file://`** → some browsers restrict IndexedDB on `file://`. Use a local server or GitHub Pages.
- **Storage full warning** → export a Full Backup, then remove old screenshots or reset.

## 🙏 Credits

- [Chart.js](https://www.chartjs.org) (MIT) — vendored at `assets/vendor/` (license included).
- Fonts: [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) & [Inter](https://fonts.google.com/specimen/Inter) (OFL).

## 📄 License

MIT — use it, fork it, make it yours. Trade well. 📈
