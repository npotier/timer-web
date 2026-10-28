# Contract: URL Query Parameter Schema

Per FR-015, the active session's mode and configuration are mirrored into the page URL's query
string in real time, so a reload or a shared link restores the same configuration (not necessarily
mid-countdown progress — see `spec.md` Edge Cases).

## Parameters

| Param | Values | Meaning |
|---|---|---|
| `mode` | `tabata` \| `rounds` \| `stopwatch` \| `plus` | Which tab/mode is active |
| `template` | string (template id) | Present only when `mode=plus`; identifies which saved custom workout is loaded |
| `prepare` | integer (seconds) | Overrides the active template's `prepareSec` for this session |
| `exercise` | integer (seconds) | Overrides `exerciseSec` |
| `rest` | integer (seconds) | Overrides `restSec` |
| `rounds` | integer | Overrides `rounds` |
| `cycles` | integer | Overrides `cycles` (omitted for `rounds`/`stopwatch`) |
| `restBetweenCycles` | integer (seconds) | Overrides `restBetweenCyclesSec` (`tabata` only) |
| `cooldown` | integer (seconds) | Overrides `cooldownSec` |

Example: `/?mode=tabata&prepare=5&exercise=20&rest=10&rounds=8&cycles=3&restBetweenCycles=60&cooldown=0`

## Behavior rules

- The app MUST use `history.replaceState` (not `pushState`) when syncing these parameters, so
  that normal in-session adjustments do not pollute the browser's back/forward history.
- On initial page load, if recognized parameters are present, they seed the session configuration
  shown before the user presses Start, taking precedence over the corresponding `WorkoutTemplate`
  stored defaults for that visit (but do not themselves mutate the stored template unless the user
  explicitly saves).
- Unrecognized or malformed parameters (non-numeric where a number is expected, out-of-range
  negative values) MUST be ignored individually, falling back to the relevant default, rather than
  failing to load the page.
- These parameters intentionally do NOT encode live countdown progress (current phase/elapsed
  time); only the configuration is shareable, consistent with the spec's Edge Cases note that a
  reload is not guaranteed to resume the exact mid-phase countdown.
