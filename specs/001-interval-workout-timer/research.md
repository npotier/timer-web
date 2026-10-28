# Phase 0 Research: Interval Workout Timer

All technical choices were specified by the user up front; no items were left as
`NEEDS CLARIFICATION` in the Technical Context. This document records the rationale and
alternatives considered for each choice, plus the design research needed to satisfy the
constitution's Timer Accuracy and PWA Resilience principles.

## 1. Reactive UI layer

- **Decision**: Alpine.js (CDN or vendored single file, no build step required for it).
- **Rationale**: Provides declarative reactive bindings (`x-data`, `x-show`, `x-bind`, `x-for`)
  directly in HTML, which keeps the four screens simple and inspectable without a component
  compiler. Matches the constitution's Simplicity/YAGNI and Mobile-First principles — ~15KB,
  no virtual DOM, no JSX/build toolchain mandatory.
- **Alternatives considered**: React/Vue (rejected — bundler + larger runtime for no added value
  on 4 screens); vanilla JS DOM manipulation only (rejected — would require hand-rolled
  reactivity for timer countdown + list rendering, more code to keep correct); Svelte (rejected —
  requires a compile step, against the "no build step required" constraint).

## 2. Styling

- **Decision**: TailwindCSS, loaded via the Play CDN for local/dev iteration, with an optional
  minimal CLI build (`npx tailwindcss`) to produce a purged `css/app.css` for production/PWA
  caching (smaller payload, no runtime CDN dependency when offline).
- **Rationale**: Utility classes make it fast to reproduce the reference screens' exact spacing,
  color blocks, and large-digit typography without hand-written CSS files per screen. A production
  build is still "static assets" — it does not introduce a server or runtime dependency, staying
  within Principle I.
- **Alternatives considered**: Hand-written CSS (rejected — slower to match the many color/layout
  variants per phase and orientation); a CSS framework with heavier JS (e.g., Bootstrap with its
  JS plugins) (rejected — unnecessary and encourages non-Tailwind patterns already decided against).

## 3. Timer accuracy strategy (Principle II, non-negotiable)

- **Decision**: The timer engine stores, per phase, a `phaseStartTimestamp` (epoch ms) and a
  `phaseDurationMs`. Remaining time for display is always computed as
  `phaseDurationMs - (now() - phaseStartTimestamp)` where `now()` is `Date.now()` (chosen over
  `performance.now()` because `performance.now()` does not advance through some OS-level sleep
  states consistently across browsers, while `Date.now()` reflects true wall-clock time, which is
  what the spec's SC-002 cares about). On every animation frame/tick **and** on every
  `visibilitychange`/`focus` event, the engine recomputes remaining time from this formula and, if
  the recomputed remaining time is `<= 0`, advances to the next phase(s) — potentially skipping
  multiple phases at once if the tab was backgrounded through several of them — rather than
  rendering a stale "0:00" and waiting for a tick that may never come on schedule.
- **Rationale**: Any approach that decrements a counter once per `setInterval` callback drifts
  because browsers throttle or fully suspend timers in backgrounded/inactive tabs. Deriving
  display state from a fixed start timestamp + elapsed wall-clock time is drift-proof by
  construction and self-heals on resume, satisfying FR-009 and SC-002.
- **Alternatives considered**: `setInterval`-based decrementing counters (rejected — the exact
  anti-pattern the constitution prohibits); Web Workers running a precise timer (rejected as
  unnecessary complexity — Workers still can't force a backgrounded tab to render, and the
  resync-on-resume approach solves the correctness problem without one, keeping Principle V).

## 4. Audio cues

- **Decision**: Web Audio API with a small set of short, synthesized or pre-bundled beep/chime
  sounds (`assets/sounds/*.mp3` or generated via `OscillatorNode` for zero-asset presets),
  gated behind a first user gesture (the Start button press) to satisfy browser autoplay policies.
- **Rationale**: Avoids needing voice-synthesis (explicitly excluded) while still giving the
  audible phase-change cue the spec requires (FR-010). Web Audio allows precise volume control and
  low-latency playback, and sidesteps `<audio>` element autoplay restrictions more reliably.
- **Alternatives considered**: `<audio>` tags per sound (rejected — more fragile autoplay/volume
  behavior across browsers, though kept as an acceptable fallback inside `audio.js` if Web Audio
  is unavailable); Web Speech API voice cues (explicitly out of scope per prior decision).

## 5. Background resilience (Principle III)

- **Decision**: Request a `navigator.wakeLock` sentinel on session start, release it on
  pause/stop/visibility-hidden, and silently continue (no error, no user-facing message) if the
  API is undefined or the request rejects. Re-request the lock automatically on `visibilitychange`
  returning to `visible` while a session is still running.
- **Rationale**: Matches FR-011 exactly; this is the only credible way to reduce (not guarantee
  elimination of) screen-lock interruptions from a web page, and iOS Safari's historical lack of
  support is explicitly accepted in the spec's Assumptions.
- **Alternatives considered**: A hidden looping silent `<video>`/`<audio>` hack to keep the tab
  "active" (rejected — unreliable, resource-wasteful, and explicitly superseded by the standard
  Wake Lock API which is now broadly supported).

## 6. PWA offline strategy

- **Decision**: A cache-first service worker that precaches the app shell (`index.html`, built
  CSS/JS, icons, sound assets) on install, and serves from cache first, falling back to network
  only for anything not precached. No network-first/stale-while-revalidate complexity is needed
  since there is no backend/API to keep fresh.
- **Rationale**: Satisfies FR-019/SC-005 (usable offline after one prior visit) with the simplest
  correct strategy given a fully static, versioned asset set (Principle V).
- **Alternatives considered**: Workbox (rejected — adds a dependency/build step for behavior a
  ~40-line hand-written service worker already covers at this scope); no service worker
  (rejected — fails the explicit PWA/offline requirement).

## 7. Deployment target

- **Decision**: Any static host (GitHub Pages, Netlify, Vercel static) — the repository root is
  directly deployable with no server process.
- **Rationale**: Confirms Principle I; no decision here blocks or changes application code.
- **Alternatives considered**: N/A — a backend-hosted deployment is explicitly excluded by the
  constitution.

## 8. "Fun mode" celebration (added after initial implementation, user-requested)

- **Decision**: A `Settings.funMode` boolean (default `false`) gates two purely decorative,
  display-only additions: (1) an SVG progress ring behind the countdown digits that depletes as
  the current phase's remaining time runs out, plus a brief CSS scale "pop" on the digit each time
  the displayed whole second changes; (2) a confetti burst via the `canvas-confetti` library
  (loaded from a CDN `<script>` tag, like Alpine.js/TailwindCSS) fired only when a session reaches
  `status: finished` (never on an early stop).
- **Rationale**: Both effects are derived from the same `sessionState` already produced by
  `timer-engine.js` each tick — they read `remainingMs`/`currentPhase`/`status` but never introduce
  a second clock or influence phase transitions, preserving Timer Accuracy (Principle II).
  `canvas-confetti` is a small (~3KB), widely-used, open-source (MIT) library — using it instead of
  hand-rolling particle physics matches Principle V (don't build what a trusted, tiny dependency
  already solves well) while still requiring no build step (CDN-loaded, like the rest of the stack).
- **Alternatives considered**: Hand-rolled CSS/DOM confetti (rejected — more code to get a
  realistic-looking burst right, for a purely cosmetic feature); floating/rotating background
  shapes unrelated to actual progress (considered and rejected in favor of the progress ring, which
  doubles as a useful at-a-glance progress indicator rather than being purely decorative); gating
  confetti on vibration/sound settings instead of a dedicated `funMode` flag (rejected — the user
  explicitly asked for a single dedicated checkbox bundling all playful effects).
