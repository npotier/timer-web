# Phase 1 Data Model: Interval Workout Timer

All entities are plain JSON-serializable objects persisted in `localStorage` (see
`contracts/storage-schema.md`) or held transiently in the Alpine.js reactive store
(`js/app.js`) during an active session. There is no database; types below describe the
in-memory/JSON shape, not a schema for a query engine.

## WorkoutTemplate

Represents a named, reusable interval configuration — either a built-in mode default or a
user-created custom workout.

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | Stable identifier; built-ins use fixed ids (`builtin-tabata`, `builtin-rounds`, `builtin-stopwatch`) |
| `name` | string | Display name; user-editable for custom workouts, fixed label for built-ins |
| `color` | string (hex or Tailwind color token) | Accent color shown in the Plus list and editor |
| `mode` | enum: `tabata` \| `rounds` \| `stopwatch` | Determines which phase sequence the timer engine runs |
| `prepareSec` | integer ≥ 0 | Countdown before the first phase |
| `exerciseSec` | integer ≥ 1 | Work/Exercise phase duration (not used by `stopwatch`) |
| `restSec` | integer ≥ 0 | Rest phase duration (Tabata/Rounds); "lap" interval for `stopwatch` |
| `rounds` | integer ≥ 1 | Exercise+Rest repetitions per cycle (Tabata) or total (Rounds); ignored by `stopwatch` |
| `cycles` | integer ≥ 1 | Repetitions of the full round sequence; `tabata`-only, defaults to `1` for `rounds`/`stopwatch` |
| `restBetweenCyclesSec` | integer ≥ 0 | Rest inserted between cycles; `tabata`-only |
| `cooldownSec` | integer ≥ 0 | Final cooldown phase after the last cycle |
| `isBuiltin` | boolean | `true` for the three default modes (not deletable, only copyable into a new custom template) |
| `createdAt` / `updatedAt` | ISO 8601 string | Bookkeeping for the Plus list and future sort/display needs |

**Validation rules** (enforced in `editor-view.js` before save, per FR-013 and spec Edge Cases):
- `name` non-empty, trimmed, max length enforced for layout (e.g., 40 chars).
- All numeric fields are non-negative integers; `exerciseSec`/`rounds`/`cycles` must be ≥ 1 to
  avoid a degenerate no-op session (a 0 is coerced to 1 with inline validation feedback).
- Large values (e.g., `rounds`/`cycles` up to 99) are accepted; the UI must not overflow on 2-3
  digit counters (Edge Case: large round/cycle counts).

## Session (runtime-only, not persisted directly)

Represents one active run of a `WorkoutTemplate`, owned entirely by `timer-engine.js`.

| Field | Type | Notes |
|---|---|---|
| `templateId` | string | Which `WorkoutTemplate` is being run (or an ad-hoc unsaved config with the same shape) |
| `phaseSequence` | array of `Phase` | Precomputed flat list of phases derived from the template (see below) |
| `currentPhaseIndex` | integer | Index into `phaseSequence` |
| `phaseStartTimestamp` | epoch ms (`Date.now()`) | Set whenever a phase starts or resumes; the sole source of truth for elapsed time (Principle II) |
| `pausedElapsedMs` | integer | Elapsed time banked before a pause, added back on resume instead of resetting `phaseStartTimestamp` to "now" |
| `status` | enum: `idle` \| `running` \| `paused` \| `finished` \| `stopped` | Drives UI and whether a History Entry is written on exit |
| `roundsCompleted` / `cyclesCompleted` | integer | Incremented as phases complete; written into the resulting History Entry |

A `Phase` (sub-structure, not separately persisted): `{ type: 'prepare'|'exercise'|'rest'|
'rest-between-cycles'|'cooldown'|'stopwatch-run', durationMs, roundNumber, cycleNumber, nextPhaseType
}`. For `stopwatch` mode, phases are generated lazily (ascending, no fixed end) rather than
precomputed as a finite array.

## HistoryEntry

A persisted record written when a Session ends (FR-016), whether finished or stopped early.

| Field | Type | Notes |
|---|---|---|
| `id` | string (UUID) | |
| `workoutName` | string | Snapshot of the template's name at completion time (survives later template edits/deletes) |
| `mode` | enum: `tabata` \| `rounds` \| `stopwatch` | |
| `completedAt` | ISO 8601 string | Timestamp when the session ended |
| `totalDurationMs` | integer | Actual elapsed wall-clock time of the session |
| `roundsCompleted` | integer | |
| `cyclesCompleted` | integer | `0`/omitted for `rounds`/`stopwatch` modes |
| `status` | enum: `finished` \| `stopped` | Distinguishes a full completion from an early stop (Edge Case / Acceptance Scenario 2 of User Story 3) |

## Settings

A single persisted object (one row, not a list) read by `audio.js`/`haptics.js` at playback time.

| Field | Type | Notes |
|---|---|---|
| `soundEnabled` | boolean | Default `true` |
| `soundPreset` | enum (e.g., `classic` \| `digital` \| `arcade`) | Selects which beep set `audio.js` plays |
| `volume` | number 0–1 | Default `0.8` |
| `tickSoundEnabled` | boolean | Per-second tick/click during the last seconds of a phase; default `false` |
| `vibrationEnabled` | boolean | Default `false`; no-op where Vibration API is unsupported |
| `funMode` | boolean | Default `false`. Toggles purely decorative/motivational effects: a depleting progress ring and a brief per-second "pop" scale on the countdown digit during a session, and a confetti burst when a session reaches `status: finished` (not on an early stop). Never affects timing or `Session`/`Phase` state — display-only, derived from the same `sessionState` each tick |
| `encouragementEnabled` | boolean | Default `false` (FR-024). When on, shows a random motivational message during each `exercise` phase at 25%/50%/75% of that phase's elapsed duration |
| `encouragementName` | string | Default `''`. Optional first name used to personalize messages (e.g. "Let's go, {name}!"); messages without a name placeholder are used when this is blank |
| `phaseColors` | object `{ prepare, exercise, rest, cycleRest }` (hex strings) | Default `{ prepare: '#facc15', exercise: '#a3e635', rest: '#ef4444', cycleRest: '#f97316' }` (the "Classic" preset). These are the full-screen session colors from FR-005 — user-configurable per FR-023. `cycleRest` colors the Rest-between-cycles phase distinctly from the ordinary between-round Rest; Cooldown reuses `rest`; Stopwatch's running phase reuses `exercise`. `exercise` additionally drives the app's interactive accent (Start button, active tab) via a CSS custom property, matching the reference app where the "go" color and the UI accent are the same color. Five named presets are offered in Settings (including a "Marseille" preset) plus a free-form color picker per phase |

## Relationships

- A `HistoryEntry` references a `WorkoutTemplate` only by denormalized `workoutName`/`mode` snapshot
  — deleting or editing a template never mutates past history (explicit design choice to keep
  history immutable and avoid dangling references, consistent with no-backend simplicity).
- `Settings` is a singleton applied globally; it is not scoped per template or per session.
- `Session` is transient and always derived from exactly one `WorkoutTemplate` (built-in or
  custom) plus any in-session ad-hoc overrides the user made via the editor before pressing Start;
  those overrides are reflected in the URL (see `contracts/url-params.md`) but only persisted to
  the `WorkoutTemplate` store if the user explicitly saves them.
