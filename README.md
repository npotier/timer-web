# Timer Web

A client-only Progressive Web App interval workout timer (Tabata / Rounds / Stopwatch / custom
workouts). No backend — everything runs in the browser, persisted via `localStorage` and URL query
parameters.

See `specs/001-interval-workout-timer/` for the full spec, plan, data model, and task list.

## Run locally

```bash
npx serve .
# open the printed http://localhost:#### URL
```

No build step is required for development — TailwindCSS and Alpine.js load from CDN in
`index.html`.

## Production CSS build (optional)

```bash
npm install
npm run build:css
```

This produces a minified `css/app.css` from `css/input.css` so production can drop the Tailwind
CDN script. Swap the `<link>`/`<script>` tags in `index.html` accordingly if you do this.
