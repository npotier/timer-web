# Implementation Plan: Interval Workout Timer (Timer Web)

**Branch**: `001-interval-workout-timer` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-interval-workout-timer/spec.md`

## Summary

A client-only Progressive Web App that reproduces the core experience of the "Timer Plus" interval
timer: four modes (Tabata, Rounds, Stopwatch, custom "Plus" workouts), a fullscreen color-coded
session screen, a workout editor, sound/vibration settings, and a workout history journal. The
technical approach is a dependency-light static site — HTML + TailwindCSS + Alpine.js for reactive
UI state — built around a UI-independent timer engine that derives all displayed time from real
wall-clock timestamps (never accumulated ticks), plus a thin persistence layer that mirrors durable
state to `localStorage` and ephemeral session configuration to URL query parameters. A manifest and
service worker make the app installable and usable offline after a first visit.

## Technical Context

**Language/Version**: JavaScript (ES2020+, native ES Modules), HTML5, CSS3

**Primary Dependencies**: TailwindCSS (utility CSS), Alpine.js (lightweight reactive UI state/
templating, ~15KB, no build step required), native Web APIs only otherwise (Web Audio API,
Screen Wake Lock API, Vibration API, Page Visibility API, Service Worker API, Web App Manifest)

**Storage**: Browser `localStorage` (workout templates, settings, history) + URL query string
(current session mode/configuration); no server-side storage, no database

**Testing**: Manual browser verification per the constitution's Simplicity principle (no mandated
automated test harness); a `quickstart.md` validation script enumerates the scenarios to exercise
by hand (desktop + mobile browser, portrait + landscape, offline, backgrounded tab)

**Target Platform**: Modern evergreen browsers (Chrome, Safari incl. iOS, Firefox, Edge), mobile-first
responsive, installable as a PWA on mobile home screens and desktop

**Project Type**: Single static web application (no frontend/backend split — there is no backend)

**Performance Goals**: First meaningful paint < 2s on a mid-range mobile connection; timer countdown
UI updates smoothly at ~4–10 renders/sec (not required to match display refresh rate, just visibly
smooth); zero perceptible input lag on Play/Pause/navigation taps

**Constraints**: Must work fully offline after one prior visit (service worker cache); countdown
accuracy must not drift by more than 1s over a 10-minute session even across backgrounding (per
spec SC-002); every hardware-adjacent API (Wake Lock, Vibration) must degrade silently when absent;
no build step should be strictly required to run the app locally, though a minimal CSS build for
Tailwind in production is acceptable

**Scale/Scope**: Single user per browser profile, no concurrency concerns; ~4 primary screens
(session view per mode, workout editor, settings, history) plus a home/navigation shell; estimated
low tens of source files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Static-First / No-Backend | No server/database in design; all persistence is `localStorage` + URL params | PASS |
| II. Timer Accuracy (NON-NEGOTIABLE) | Timer engine design (Phase 1) is timestamp-based with resync on visibility change; no `setInterval`-accumulation is used for authoritative time | PASS (to be enforced in `data-model.md` / engine design) |
| III. PWA Resilience | `manifest.json` + service worker planned; Wake Lock/Vibration explicitly designed as optional, non-blocking enhancements | PASS |
| IV. Mobile-First & Accessible UI | TailwindCSS + Alpine.js chosen; layouts planned for portrait/landscape; no heavy framework introduced | PASS |
| V. Simplicity & YAGNI | No bundler mandated for dev; Alpine.js chosen over React/Vue specifically for minimal footprint; features map 1:1 to spec requirements, no speculative abstractions | PASS |

No violations identified. Complexity Tracking table is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-interval-workout-timer/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── storage-schema.md
│   └── url-params.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
index.html                   # App shell: nav, mounts all screens (Alpine x-data root)
manifest.json                # PWA manifest
service-worker.js            # Cache-first offline shell for static assets
css/
└── input.css                # Tailwind directives (+ any minimal custom CSS); built to css/app.css
js/
├── app.js                   # Alpine component registration, screen router/state
├── timer-engine.js          # UI-independent timer/session state machine (timestamp-based)
├── storage.js                # localStorage read/write + URL query param sync
├── audio.js                  # Web Audio-based short beep/sound presets, volume, ducking best-effort
├── haptics.js                 # Vibration API wrapper (no-op fallback)
├── wakelock.js                 # Screen Wake Lock wrapper (no-op fallback)
└── views/
    ├── session-view.js        # Fullscreen countdown screen (all modes share this renderer)
    ├── editor-view.js          # Custom workout create/edit screen
    ├── settings-view.js        # Settings screen
    └── history-view.js         # History/journal screen
assets/
├── icons/                      # PWA icons (multiple sizes)
└── sounds/                     # Short beep/chime audio files (presets)
```

**Structure Decision**: Single static project at the repository root (Option 1, simplified for a
no-backend app — no `src/`, `tests/`, or `backend/`/`frontend/` split needed since there is exactly
one deployable artifact: the static site itself). `js/timer-engine.js` is kept framework-agnostic
and dependency-free so Timer Accuracy (Principle II) can be reasoned about and manually verified in
isolation from Alpine.js's rendering layer.

## Complexity Tracking

*No constitution violations — table intentionally omitted.*
