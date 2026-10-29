# Timer Web

A client-only Progressive Web App interval workout timer (Tabata / Rounds / Stopwatch / custom
workouts). No backend — everything runs in the browser, persisted via `localStorage` and URL query
parameters.

See `specs/001-interval-workout-timer/` for the full spec, plan, data model, and task list. See
`CHANGELOG.md` for a history of notable changes.

## Features

- Tabata, Rounds, Stopwatch, and custom ("Plus") interval workouts with persisted templates.
- Fullscreen, color-coded session screen with Play/Pause, phase navigation, and "up next" preview.
- Workout history journal.
- Settings: sound presets/volume, tick sound, vibration, Fun mode (progress ring, bouncy digits,
  confetti on completion), configurable Prepare/Exercise/Rest/Rest-between-cycles phase colors
  (5 presets incl. "Marseille"), and Encouragement mode (optional motivational messages at
  25/50/75% through each Exercise phase, personalized with your first name).
- Installable PWA with offline support for previously visited screens.

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
