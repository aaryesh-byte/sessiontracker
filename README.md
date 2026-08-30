# Inline Freestyle Skating Tracker — Modular HTML Refactor

This is a structural refactor of the supplied working HTML application. Existing UI, data, API URL and functionality were preserved as much as possible; no feature redesign was intentionally added.

## Structure
- `index.html` — application shell, authentication, shared header, navigation and page loader.
- `pages/*.html` — separate HTML modules for Dashboard, Training, History, and Custom Tricks.
- `css/global.css` — existing shared design system/styles.
- `css/*.css` — reserved page-specific style files.
- `js/app.js` — shared state, auth, theme, navigation/page loading and shared helpers.
- `js/dashboard.js` — dashboard/graph logic.
- `js/training.js` — training session logic.
- `js/history.js` — history logic.
- `js/custom-tricks.js` — custom trick logic.
- `data/tricks.js` — existing trick matrix and family point ranges.
- `js/config.js` — Apps Script URL.

## Run
Use VS Code Live Server (or another local HTTP server). Do not open `index.html` directly with `file://`, because the modular page loader uses `fetch()` to load the HTML modules.

The current backend URL remains in `js/config.js`. Future feature changes can be made module-by-module.
