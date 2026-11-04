# YETI Flight Trial

## Application architecture

The application is split into independent code areas so that a change to one workspace can be made without editing the other workspace.

### Page entry point
- `index.html` — page structure, navigation markup, and stylesheet/script loading only.

### JavaScript
- `js/main-navigation.js` — top-level tab switching, selected-tab persistence, refresh control, and service-worker registration.
- `js/flight-preparation.js` — Flight Preparation workspace logic: SOP, daily airworthiness, loading/unloading checklists, previews, signatures, evidence, and PDF handling.
- `js/propulsion-analyser.js` — Propulsion Test Bench Log Analyzer workspace logic: CSV selection, upload status, and analysis progress. Future propulsion analysis features belong here.

### CSS
- `css/app.css` — shared application and existing Flight Preparation presentation styles.
- `css/propulsion-analyser.css` — Propulsion Test Bench Log Analyzer presentation only.

### Offline / PWA
- `service-worker.js` — application shell cache, including the separated CSS and JavaScript files.

## Change-isolation convention

- For a request about **Flight Preparation**, modify `js/flight-preparation.js` and, when needed, `css/app.css`. Do not modify propulsion analyser files.
- For a request about **Propulsion Test Bench Log Analyzer**, modify `js/propulsion-analyser.js` and `css/propulsion-analyser.css`. Do not modify Flight Preparation files.
- For top-level tabs, refresh persistence, or app-wide navigation, modify `js/main-navigation.js`.
- Modify `index.html` only when workspace structure, tab markup, or file loading needs to change.
- Update `service-worker.js` only when cached application files or the cache version changes.

Keep workspace-specific logic in its own file and avoid adding new workspace behaviour to the page entry point.
