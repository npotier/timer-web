# Contract: `localStorage` Schema

This app has no network API; its external contract is the shape of data it persists to
`localStorage`, since that is what other code (future features, or a user inspecting devtools)
can rely on. All keys are namespaced under a single prefix to avoid collisions with other sites'
data sharing the same origin assumptions during local development.

## Keys

### `timerweb.templates.v1`

JSON array of `WorkoutTemplate` objects (see `data-model.md`), including the built-in modes'
current override values (if the user has changed a built-in mode's default durations, those
changes are saved here too rather than only in the URL, so they persist across visits).

```json
[
  {
    "id": "builtin-tabata",
    "name": "Tabata",
    "color": "#facc15",
    "mode": "tabata",
    "prepareSec": 5,
    "exerciseSec": 20,
    "restSec": 10,
    "rounds": 8,
    "cycles": 1,
    "restBetweenCyclesSec": 60,
    "cooldownSec": 0,
    "isBuiltin": true,
    "createdAt": "2026-10-28T00:00:00.000Z",
    "updatedAt": "2026-10-28T00:00:00.000Z"
  }
]
```

### `timerweb.history.v1`

JSON array of `HistoryEntry` objects, newest first. No hard cap is imposed by this contract, but
the History screen MAY truncate the displayed list for performance; the underlying array is the
full record until the user clears it.

### `timerweb.settings.v1`

A single JSON object (not an array) matching the `Settings` shape in `data-model.md`.

## Versioning & migration

- Each key carries a `.v1` suffix. If a future change is backward-incompatible, a new key
  (`.v2`) MUST be introduced and a one-time migration read the old key, transform, write the new
  key, and leave the old key untouched (never delete silently) — consistent with Principle V
  (simple, inspectable migrations, no hidden destructive writes).
- Any read of these keys MUST tolerate a missing key (first-ever visit) by falling back to an
  empty array / default `Settings` object, and MUST tolerate malformed JSON (corrupted or
  hand-edited by the user) by logging a warning and falling back to the same defaults rather than
  throwing — per the spec's "localStorage full/disabled/blocked" edge case, write failures must
  also be caught and surfaced as a non-blocking message rather than crashing the session.

## Out of scope

- No encryption, no quota negotiation beyond catching `QuotaExceededError` on write.
- No cross-tab sync (a `storage` event listener MAY be added later to refresh the Plus/History
  lists live if the app is open in two tabs, but this is not required by the current spec).
