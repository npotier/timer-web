---

description: "Task list for Interval Workout Timer (Timer Web)"
---

# Tasks: Interval Workout Timer (Timer Web)

**Input**: Design documents from `/specs/001-interval-workout-timer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Not requested in the spec; the constitution (Principle V) relies on manual browser
verification via `quickstart.md` instead of an automated test harness. No test tasks are included.

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md) to enable independent
implementation and testing of each story.

## Path Conventions

Single static project at the repository root, per `plan.md`'s Project Structure:
`index.html`, `manifest.json`, `service-worker.js`, `css/`, `js/`, `js/views/`, `assets/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding so any screen can be built and served locally.

- [ ] T001 Create the repository root structure per `plan.md`: `index.html`, `css/input.css`,
      `js/` (empty `app.js`, `timer-engine.js`, `storage.js`, `audio.js`, `haptics.js`,
      `wakelock.js`), `js/views/` (empty `session-view.js`, `editor-view.js`,
      `settings-view.js`, `history-view.js`), `assets/icons/`, `assets/sounds/`.
- [ ] T002 In `index.html`, add the HTML5 boilerplate, a `<meta name="viewport">` tag for
      mobile-first scaling, load TailwindCSS via the Play CDN `<script>` for development, load
      Alpine.js via CDN `<script defer>`, and link `css/input.css` (Tailwind directives
      `@tailwind base; @tailwind components; @tailwind utilities;`).
- [ ] T003 [P] Add a `package.json` with a `build:css` script running
      `tailwindcss -i css/input.css -o css/app.css --minify` for the optional production build
      described in `research.md` §2, and a `README.md` documenting `npx serve .` as the local dev
      command (per `quickstart.md`).
- [ ] T004 [P] Create placeholder PWA icons in `assets/icons/` (at least 192x192 and 512x512 PNG)
      and at least 3 short beep/chime sound files (or note that `audio.js` will synthesize tones
      via `OscillatorNode` instead, per `research.md` §4 — pick one approach and apply it
      consistently in `assets/sounds/`).

**Checkpoint**: Project can be served locally (`npx serve .`) and shows a blank page with Tailwind
and Alpine loaded without console errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The timer engine, persistence layer, and cross-cutting hardware wrappers that every
user story depends on. No user-story screen is built until this phase is done.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Implement `js/timer-engine.js` as a dependency-free ES module exporting a timer/session
      state machine per `data-model.md`'s `Session`/`Phase` model: it MUST store
      `phaseStartTimestamp` (from `Date.now()`) and `phaseDurationMs` per phase, compute remaining
      time as `phaseDurationMs - (Date.now() - phaseStartTimestamp)` (never a decremented counter),
      and expose `start(template)`, `pause()`, `resume()`, `stop()`, `nextPhase()`,
      `previousPhase()`, `getState()` per `research.md` §3. On `resume()`, elapsed paused time MUST
      be excluded from the remaining-time calculation (`pausedElapsedMs` field in `data-model.md`).
- [ ] T006 In `js/timer-engine.js`, implement phase-sequence generation for the three modes from
      `data-model.md`'s `WorkoutTemplate`: `tabata` (prepare → [exercise/rest] × rounds →
      rest-between-cycles → repeat × cycles → cooldown), `rounds` (prepare → [exercise/rest] ×
      rounds, no cycles), and `stopwatch` (prepare → ascending count with a repeating lap/rest
      marker every `restSec`, no fixed end — generated lazily, not as a finite array).
- [ ] T007 In `js/timer-engine.js`, add a `visibilitychange`/`focus` listener (or an exposed
      `resync()` method called by `js/app.js` on those events) that recomputes remaining time from
      real elapsed time and advances past any phases whose duration has already elapsed while the
      tab was hidden, per `research.md` §3 and spec FR-009/SC-002 — this MUST NOT render a stale
      value while waiting for the next tick.
- [ ] T008 [P] Implement `js/storage.js` exposing `getTemplates()`, `saveTemplate(template)`,
      `deleteTemplate(id)`, `getSettings()`, `saveSettings(settings)`, `getHistory()`,
      `addHistoryEntry(entry)`, `deleteHistoryEntry(id)`, `clearHistory()`, all reading/writing the
      exact keys and JSON shapes in `contracts/storage-schema.md`
      (`timerweb.templates.v1`, `timerweb.history.v1`, `timerweb.settings.v1`). Every read MUST
      fall back to an empty array / default `Settings` object on a missing or malformed key
      (catch JSON parse errors, log a warning, do not throw). Every write MUST catch
      `QuotaExceededError` / storage-disabled errors and return a success/failure result instead of
      throwing, per the storage-schema contract's "Versioning & migration" section.
- [ ] T009 [P] In `js/storage.js`, implement URL query parameter sync per
      `contracts/url-params.md`: a `readSessionConfigFromURL()` that parses `mode`, `template`,
      `prepare`, `exercise`, `rest`, `rounds`, `cycles`, `restBetweenCycles`, `cooldown` (ignoring
      individually any non-numeric/out-of-range value and falling back to the template default for
      that field only), and a `writeSessionConfigToURL(config)` that uses `history.replaceState`
      (never `pushState`) to update those same parameters in real time as the user adjusts
      configuration.
- [ ] T010 [P] Implement `js/audio.js` using the Web Audio API per `research.md` §4: an
      `initOnFirstGesture()` call wired to the Start button press, a `playCue(phaseType)` function
      that selects a short sound based on the current `Settings.soundPreset`, honors
      `Settings.soundEnabled` and `Settings.volume` (0–1), and a `playTick()` for the optional
      per-second tick sound. If Web Audio initialization fails, fall back to silent no-ops rather
      than throwing.
- [ ] T011 [P] Implement `js/haptics.js` exposing `vibrate(patternMs)` that calls
      `navigator.vibrate` only when `Settings.vibrationEnabled` is true and the API exists,
      resolving to a no-op otherwise (FR-012).
- [ ] T012 [P] Implement `js/wakelock.js` exposing `requestWakeLock()` / `releaseWakeLock()`
      wrapping `navigator.wakeLock.request('screen')`, resolving to a no-op with no thrown error
      when the API is undefined or the request rejects, and re-requesting automatically on
      `visibilitychange` back to `visible` while a session is still running, per `research.md` §5
      and FR-011.
- [ ] T013 Implement `manifest.json` (name, short_name, icons from `assets/icons/`,
      `display: standalone`, theme/background colors matching the app's dark UI) and
      `service-worker.js` implementing the cache-first precache strategy from `research.md` §6:
      precache `index.html`, built CSS/JS, icons, and sound assets on `install`, serve from cache
      first with network fallback on `fetch`. Register the service worker from `js/app.js`.
- [ ] T014 Implement `js/app.js` as the Alpine.js root: register the top-level `x-data` store
      holding current screen/mode, the three built-in `WorkoutTemplate` defaults (seeded into
      `js/storage.js` on first run if `timerweb.templates.v1` is empty), and wiring between
      `timer-engine.js`, `storage.js`, `audio.js`, `haptics.js`, and `wakelock.js`. Implement the
      bottom navigation bar (Tabata / Rounds / Stopwatch / Plus tabs) in `index.html` bound to this
      store.

**Checkpoint**: Foundation ready — the timer engine can be exercised from the browser console
(`import` + manually call `start()`/`pause()`), storage round-trips survive a reload, and the app
installs as a PWA. No screens are visible yet beyond the bare navigation shell.

---

## Phase 3: User Story 1 - Run a Tabata interval workout (Priority: P1) 🎯 MVP

**Goal**: A user can open the Tabata tab, optionally adjust values, start a session, and watch it
run correctly through prepare/exercise/rest/cooldown with accurate, drift-free timing, pause/resume,
manual navigation, and best-effort wake lock — in both portrait and landscape.

**Independent Test**: Open the Tabata tab with default values, press Start, and observe correct
phase/color/countdown behavior through at least one full round and cycle, including after
backgrounding the tab (per `quickstart.md` scenarios 1–5).

- [ ] T015 [US1] Implement `js/views/session-view.js` + the corresponding Alpine template block in
      `index.html`: full-screen color-coded phase display (Prepare = yellow/amber, Exercise/Work =
      green, Rest = red per FR-005), large high-contrast countdown digits, current phase label, an
      "up next" bar showing the following phase, and rounds-remaining / cycles-remaining counters
      (FR-006), all bound reactively to `timer-engine.js`'s state via a polling/animation-frame tick
      that calls `getState()`.
- [ ] T016 [US1] Add Play/Pause, Reset, and forward/back phase-navigation controls to
      `session-view.js`/`index.html`, wired to `timer-engine.js`'s `pause()`/`resume()`/`stop()`/
      `nextPhase()`/`previousPhase()` (FR-007), plus quick-access icons to Settings and History
      (navigating to those screens; screens themselves built in later phases but the nav targets
      must exist as placeholders now).
- [ ] T017 [US1] Build the Tabata tab's configuration UI (before Start is pressed): inputs for
      Prepare, Exercise, Rest, Rounds, Cycles, Rest-between-cycles, Cooldown seeded from the
      `builtin-tabata` `WorkoutTemplate` (FR-002), calling `writeSessionConfigToURL()` (T009) on
      every change so the URL stays in sync in real time (FR-015).
- [ ] T018 [US1] Add responsive portrait/landscape layouts for `session-view.js` in
      `css/input.css`/Tailwind classes: landscape uses vertical color bands (matching the reference
      screens) instead of horizontal, and the countdown must keep running uninterrupted through an
      orientation change (FR-008) — verify via `timer-engine.js`'s timestamp-based state, which is
      orientation-agnostic by construction.
- [ ] T019 [US1] Wire `js/audio.js` `playCue()` calls into `timer-engine.js` phase-transition
      events (or into `js/app.js`'s tick loop reacting to phase-index changes) so a short sound
      plays at every transition when `Settings.soundEnabled` is true (FR-010), and wire
      `js/wakelock.js` `requestWakeLock()`/`releaseWakeLock()` to session start/pause/stop (FR-011).
- [ ] T020 [US1] Handle the minimal-values and rapid-input edge cases from `spec.md`: ensure
      `timer-engine.js`/`editor` input coercion treats 0-second phases as instantly-passed (no
      stuck UI) and Rounds/Cycles = 1 as a valid single pass; verify rapid Play/Pause/navigation
      taps never desync the displayed phase from `getState()`'s true value (re-render only from
      `getState()`, never from locally-mutated UI counters).

**Checkpoint**: User Story 1 is fully functional and testable independently of US2–US4 — the
Tabata mode alone is a shippable MVP.

---

## Phase 4: User Story 2 - Create and reuse a custom workout (Priority: P2)

**Goal**: A user can create, edit, duplicate, and delete named custom workouts in the Plus tab,
each launching the shared session engine/view from US1 with its saved configuration.

**Independent Test**: Create a custom workout with distinct name/color/intervals, save it, reload
the page, confirm it persists in the Plus list, launch it, and confirm it runs with the saved
values (per `quickstart.md` scenario 6).

- [ ] T021 [US2] Implement the Plus tab list view in `js/views/editor-view.js`/`index.html`:
      render all `WorkoutTemplate` entries from `js/storage.js` `getTemplates()` (built-ins and
      custom) with their `color` swatch and `name` (FR-013), an "Add" button, and per-item
      edit/duplicate/delete affordances.
- [ ] T022 [US2] Implement the workout editor form in `js/views/editor-view.js`: fields for `name`
      (required, non-empty, trimmed, max ~40 chars per `data-model.md`), `color` picker, and
      numeric inputs for `prepareSec`, `exerciseSec`, `restSec`, `rounds`, `cycles`,
      `restBetweenCyclesSec`, `cooldownSec` — enforcing `data-model.md`'s validation rules
      (`exerciseSec`/`rounds`/`cycles` ≥ 1, all fields non-negative integers, large values up to at
      least 99 accepted without layout breakage) with inline error messages, plus Cancel/Save
      buttons (FR-013).
- [ ] T023 [US2] Wire Save to `js/storage.js` `saveTemplate()` (creating a new UUID `id` for new
      workouts, preserving `id` on edits, stamping `createdAt`/`updatedAt`), wire Delete to
      `deleteTemplate()` with a confirmation prompt, and wire Duplicate to create a copy with a new
      `id` and `name` suffixed (e.g., "Copy of …") (FR-013, FR-014).
- [ ] T024 [US2] Wire tapping a Plus-list item to load that `WorkoutTemplate` into
      `timer-engine.js` via `start(template)` and navigate to the shared `session-view.js` from
      US1 (T015–T016), confirming the session uses exactly the saved interval values end-to-end.
- [ ] T025 [US2] Handle the storage-failure edge case: if `js/storage.js` `saveTemplate()` reports
      a write failure (quota exceeded/storage disabled, per `contracts/storage-schema.md`), show a
      non-blocking visible error message in the editor instead of silently losing the user's input
      or crashing.

**Checkpoint**: User Stories 1 AND 2 both work independently — Plus-tab custom workouts reuse the
US1 session engine/view without modifying it.

---

## Phase 5: User Story 3 - Review workout history (Priority: P3)

**Goal**: Every finished or stopped session is recorded, and the user can view, delete individual
entries, or clear the whole history.

**Independent Test**: Complete a session and confirm a correct history entry appears; stop a
session early and confirm a partial-progress entry appears; delete one entry and clear all,
confirming correct removal each time (per `quickstart.md` scenario 7).

- [ ] T026 [US3] In `js/app.js` (or `timer-engine.js` via an `onSessionEnd` callback), build a
      `HistoryEntry` per `data-model.md` whenever a session reaches `status: finished` or
      `status: stopped` — snapshotting `workoutName`, `mode`, `completedAt` (ISO 8601 "now"),
      `totalDurationMs` (true elapsed wall-clock time from the engine, not a UI-estimated value),
      `roundsCompleted`, `cyclesCompleted`, and `status`, then call `js/storage.js`
      `addHistoryEntry()` (FR-016).
- [ ] T027 [US3] Implement `js/views/history-view.js`/`index.html`: list entries from
      `getHistory()` newest-first, showing workout name, date/time, total duration, and
      rounds/cycles completed (FR-017), with a per-entry delete button calling
      `deleteHistoryEntry(id)`.
- [ ] T028 [US3] Add a "Clear history" action to `history-view.js` that requires user confirmation
      before calling `clearHistory()` (FR-017), and ensure the quick-access History icon added in
      T016 navigates here.

**Checkpoint**: User Stories 1, 2, and 3 all work independently; history accurately reflects both
US1 (built-in modes) and US2 (custom workout) sessions.

---

## Phase 6: User Story 4 - Adjust sound and feedback settings (Priority: P3)

**Goal**: The user can control sound on/off, sound preset, volume, tick sound, and vibration from a
Settings screen, with values persisted and applied to all future sessions.

**Independent Test**: Toggle sound off, run a session, confirm silence with normal visuals;
re-enable, change preset/volume, confirm audible changes; toggle vibration where supported; reload
and confirm persistence (per `quickstart.md` scenario 8).

- [ ] T029 [US4] Implement `js/views/settings-view.js`/`index.html`: toggle for
      `soundEnabled`, a select for `soundPreset` (matching the presets implemented in `js/audio.js`
      in T010), a volume slider (0–1) for `volume`, a toggle for `tickSoundEnabled`, and a toggle
      for `vibrationEnabled` (FR-018), initialized from `js/storage.js` `getSettings()`.
- [ ] T030 [US4] Wire every Settings control to call `js/storage.js` `saveSettings()` immediately
      on change (FR-014), and ensure `js/audio.js`/`js/haptics.js` read the live `Settings` object
      (not a stale cached copy) on every `playCue()`/`playTick()`/`vibrate()` call so changes take
      effect without requiring a session restart.
- [ ] T031 [US4] Ensure the quick-access Settings icon added in T016 navigates here, and that a
      device/browser lacking the Vibration API leaves the vibration toggle inert (no error, setting
      is simply a no-op per `js/haptics.js` from T011) rather than hidden or broken.

**Checkpoint**: All four user stories work independently and together; the full feature set from
`spec.md` is implemented.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening that spans multiple stories, per `quickstart.md` scenarios 9–11 and
the spec's remaining Edge Cases / Success Criteria.

- [ ] T032 [P] Implement the Rounds mode (`builtin-rounds` template + its configuration UI,
      reusing `session-view.js`/`timer-engine.js` exactly as Tabata does but without
      cycles/rest-between-cycles/cooldown fields, per FR-003) — this was deferred out of the US1
      phase since US1's acceptance scenarios focus on Tabata, but FR-003 requires it for the
      overall feature.
- [ ] T033 [P] Implement the Stopwatch mode (`builtin-stopwatch` template + its configuration UI,
      the ascending-count phase generation from T006, with a "lap"/rest interval that, if set to
      `0`, disables automatic lap marking rather than looping continuously, per the spec's Edge
      Cases) (FR-004).
- [ ] T034 [P] Run through `quickstart.md` scenario 10 (offline usability) end-to-end: fix any gaps
      in `service-worker.js`'s precache list (T013) so a full session can run with zero network
      errors after one prior online visit (SC-005).
- [ ] T035 [P] Run through `quickstart.md` scenario 11 (edge cases: minimal values, large
      round/cycle counts, disabled localStorage) and fix any layout overflow or unhandled-exception
      issues found in `session-view.js`, `editor-view.js`, or `storage.js`.
- [ ] T036 Perform a full manual pass of all 11 `quickstart.md` scenarios on one desktop browser
      and one mobile browser (or mobile emulation with touch + orientation change), confirming
      SC-001 through SC-006 from `spec.md` are met.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)**: strictly sequential; nothing else can start
  before T001–T014 are done.
- **Phase 3 (US1)** depends only on Phase 2. It is the MVP and can ship alone.
- **Phase 4 (US2)** depends on Phase 2 and reuses `session-view.js`/`timer-engine.js` built in
  Phase 3 (T015–T016) — so in practice Phase 3 should land first, though US2's own tasks
  (T021–T025) touch different files and could be developed in parallel by a second contributor
  once T015/T016 exist as a stable interface.
- **Phase 5 (US3)** depends on Phase 2 only (it listens for session-end events from the engine
  built in Phase 2/T005, not on US1's or US2's UI) and can be developed in parallel with Phases 3–4.
- **Phase 6 (US4)** depends on Phase 2 only (`audio.js`/`haptics.js` from T010–T011) and can be
  developed in parallel with Phases 3–5.
- **Phase 7 (Polish)** depends on all prior phases being functionally complete.

## Parallel Execution Examples

- Within Phase 2, T008–T012 (`storage.js` persistence, `storage.js` URL sync, `audio.js`,
  `haptics.js`, `wakelock.js`) are marked `[P]` and touch distinct files — can be built
  concurrently once T005–T007 (`timer-engine.js`) establish the `Session`/`Phase` shapes they
  depend on.
- Once Phase 2 is complete, Phases 4, 5, and 6 (US2, US3, US4) can be worked in parallel by
  different contributors, since they touch distinct view files (`editor-view.js`,
  `history-view.js`, `settings-view.js`) and only read the shared engine/storage contracts, not
  each other's screens — Phase 4 additionally needs T015–T016 from Phase 3 to exist first.
- In Phase 7, T032–T035 are marked `[P]` (Rounds mode, Stopwatch mode, offline pass, edge-case
  pass) since they touch largely independent areas; T036 (final full manual pass) must run last.

## Implementation Strategy

**MVP first**: Complete Phase 1 → Phase 2 → Phase 3 (US1) and ship. This alone satisfies the
feature's primary value proposition (SC-001, SC-002) with a working, drift-free Tabata timer.

**Incremental delivery**: Add Phase 4 (US2, custom workouts) next for return-usage value, then
Phases 5–6 (US3 history, US4 settings) in either order since they are mutually independent, then
Phase 7 to round out the remaining built-in modes (Rounds, Stopwatch) and harden offline/edge-case
behavior before considering the feature complete per `spec.md`.
