# Quickstart & Validation Guide: Interval Workout Timer

## Prerequisites

- Any static file server (no backend process needed). Examples:
  - `npx serve .`
  - `python3 -m http.server 8080`
- (Optional, production only) Node + npm to run the Tailwind CLI build:
  `npx tailwindcss -i css/input.css -o css/app.css --minify`

## Run locally

```bash
npx serve .
# open http://localhost:3000 (or the port shown)
```

Alpine.js and (dev) Tailwind are loaded via CDN `<script>`/`<link>` tags in `index.html`, so no
install step is required to iterate during development.

## Validation scenarios

Each scenario below maps to an Acceptance Scenario in `spec.md`. Run manually in at least one
desktop browser and one mobile browser (or mobile emulation with touch + orientation change).

1. **Default Tabata run (US1 / Scenario 1)**
   - Open the app, confirm the Tabata tab is active with sane defaults.
   - Press Start. Confirm: yellow Prepare countdown → green Exercise → red Rest → repeats for the
     configured rounds → cooldown/completion, with an audible cue at every transition.

2. **Background drift check (US1 / Scenario 2, SC-002)**
   - Start a session, switch to another browser tab (or lock the phone screen) for longer than the
     current phase's remaining time, then return.
   - Confirm the displayed phase/countdown matches what true elapsed time implies — i.e., it has
     already advanced past phases whose duration elapsed while backgrounded, not frozen at the
     value last rendered before backgrounding.

3. **Pause/resume (US1 / Scenario 3)**
   - Start a session, press Pause mid-phase, wait several seconds, press Play.
   - Confirm the countdown resumes from the exact value shown at Pause (not the wall-clock time
     that passed during the pause).

4. **Manual phase navigation (US1 / Scenario 4)**
   - During a session, tap the forward and back arrows.
   - Confirm the phase/color/label/countdown update immediately to the target phase.

5. **Wake lock degrades gracefully (US1 / Scenario 5)**
   - On a browser supporting Wake Lock: start a session and confirm the screen does not auto-dim.
   - On a browser without support (or with it disabled): confirm the session still runs with no
     console errors.

6. **Custom workout lifecycle (US2, all scenarios)**
   - Plus tab → Add → fill name/color/intervals → Save → confirm it appears in the list.
   - Launch it, confirm it uses the saved values.
   - Edit a value, save, relaunch, confirm the new value is used.
   - Delete it, confirm it disappears.
   - Reload the whole page (simulating a new visit) and confirm remaining templates persist.

7. **History recording (US3, all scenarios)**
   - Complete a session fully; open History; confirm an entry with `status: finished` and correct
     name/date/duration/rounds/cycles.
   - Start and stop a session early; confirm a `status: stopped` entry with partial counts.
   - Delete a single entry; confirm only it is removed.
   - Clear all history; confirm the list is empty after confirming the prompt.

8. **Settings (US4, all scenarios)**
   - Disable sound; run a session; confirm silence but normal visual transitions.
   - Change sound preset; confirm the new sound plays.
   - Adjust volume; confirm perceived loudness changes accordingly.
   - Toggle vibration on a supporting device; confirm a brief vibration per transition; on a
     non-supporting device/browser, confirm no error.
   - Reload the page; confirm all settings values persisted.

9. **Orientation & responsiveness (FR-008)**
   - During an active session, rotate the device between portrait and landscape.
   - Confirm the countdown keeps running uninterrupted and the layout reflows (vertical color
     bands in landscape, matching the reference screens) without visual breakage.

10. **Offline usability (FR-019, SC-005)**
    - Load the app once online (so the service worker installs and precaches).
    - Go offline (airplane mode / devtools "Offline").
    - Reload the app; confirm it loads and a full timer session can run end-to-end with no network
      errors in the console.

11. **Edge cases spot-check**
    - Set all durations to minimal values and 1 round/cycle; confirm the session starts and ends
      cleanly.
    - Set Rounds/Cycles to a large number (e.g., 99); confirm counters display without layout
      breakage.
    - With `localStorage` disabled (private/incognito mode blocking storage, or devtools storage
      override), confirm a session can still run in the current tab, and saving a template/settings
      surfaces a visible, non-crashing message instead of failing silently or throwing.

## Where to look when something fails

- Timer drift → `js/timer-engine.js` (should derive all time from `Date.now()` deltas, see
  `research.md` §3)
- Persistence shape mismatches → `contracts/storage-schema.md`, `contracts/url-params.md`
- Entity field questions → `data-model.md`
