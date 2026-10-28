# Feature Specification: Interval Workout Timer (Timer Web)

**Feature Branch**: `001-interval-workout-timer`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Timer Plus Web — PWA de minuteur d'entraînement par intervalles (clone fonctionnel de l'app iOS Timer Plus), entièrement côté client (HTML/CSS/JS + TailwindCSS), sans backend." Full scope: four timer modes (Tabata, Rounds, Stopwatch, custom "Plus" workouts), a fullscreen session screen with color-coded phases, a custom-workout editor, a settings screen (sound/vibration), a workout history journal, and client-only persistence (localStorage + URL query parameters). Heart-rate integration, voice-synthesized coaching, and multi-language UI are explicitly out of scope; English-only UI, beep-based audio cues, and best-effort Wake Lock/Vibration are the accepted defaults.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a Tabata interval workout (Priority: P1)

A person about to exercise opens the app, picks the Tabata tab, optionally adjusts the work/rest/round/cycle durations, and starts the session. The app counts down through a prepare phase, then alternates work and rest phases for the configured number of rounds and cycles, clearly signaling with color and a short sound each time the phase changes, and shows a cooldown at the end.

**Why this priority**: This is the core reason the product exists — a correct, trustworthy interval timer. Every other feature (templates, history, settings) is in service of this flow. Without it there is no product.

**Independent Test**: Can be fully tested by opening the Tabata tab with default values, pressing Start, and observing that the displayed phase, color, and countdown update correctly and audibly through at least one full round and cycle, including while the browser tab is backgrounded and refocused.

**Acceptance Scenarios**:

1. **Given** the Tabata tab with Prepare=5s, Exercise=20s, Rest=10s, Rounds=2, Cycles=1, **When** the user presses Start, **Then** the screen shows a yellow "Prepare" phase counting down from 5, followed by a green "Exercise" phase counting down from 20, a red "Rest" phase counting down from 10, a second Exercise/Rest pair, and finally a completion state — with a distinct short sound at every phase transition.
2. **Given** an active session, **When** the user backgrounds the browser tab (or locks the screen) for longer than the remaining time in the current phase, **Then** upon returning to the app the displayed phase and countdown reflect the time that has genuinely elapsed, not the time at which the tab was backgrounded.
3. **Given** an active session, **When** the user presses Pause, **Then** the countdown stops advancing and resumes from the exact same remaining time when Play is pressed again.
4. **Given** an active session, **When** the user presses the forward/back navigation arrows, **Then** the session jumps to the next/previous phase immediately, updating color, label, and countdown accordingly.
5. **Given** an active session on a device that supports it, **When** the session is running, **Then** the screen does not automatically dim/lock due to inactivity; if the capability is unavailable, the session still runs correctly without error.

---

### User Story 2 - Create and reuse a custom workout (Priority: P2)

A returning user wants a workout tailored to their own routine (e.g., a specific exercise name, duration, and round/cycle structure) that they can launch again later without re-entering the same values.

**Why this priority**: Turns the app from a one-off calculator into a tool people return to; depends on the P1 timer engine already existing, since a custom workout is just a named, saved configuration of the same engine.

**Independent Test**: Can be fully tested by creating a new workout with a custom name, color, and interval values, saving it, closing and reopening the app, and confirming the workout appears in the "Plus" list and launches with the saved values.

**Acceptance Scenarios**:

1. **Given** the "Plus" tab, **When** the user taps "Add" and fills in a name, color, and interval values (Prepare, Exercise, Rest, Rounds, Cycles, Rest-between-cycles, Cooldown) then taps Save, **Then** the new workout appears in the Plus list with its chosen name and color.
2. **Given** a saved custom workout, **When** the user taps it, **Then** a session starts using exactly the saved interval values.
3. **Given** a saved custom workout, **When** the user edits one of its values and saves, **Then** the next time the workout is launched it uses the updated values.
4. **Given** a saved custom workout, **When** the user deletes it, **Then** it no longer appears in the Plus list and is not recoverable.
5. **Given** the app is closed and reopened (new browser session, same device/browser), **When** the user opens the Plus tab, **Then** previously saved custom workouts are still present.

---

### User Story 3 - Review workout history (Priority: P3)

After finishing one or more sessions, a user wants to see what they did — which workout, when, how long, and how much of it they completed.

**Why this priority**: Adds motivational/tracking value on top of the core timer but is not required for the timer to be useful on day one.

**Independent Test**: Can be fully tested by completing (or stopping partway through) a session and then opening the History screen to confirm an entry was recorded with the correct workout name, date/time, total duration, and rounds/cycles completed.

**Acceptance Scenarios**:

1. **Given** a completed session, **When** the user opens History, **Then** a new entry appears showing the workout name, completion date/time, total elapsed duration, and number of rounds/cycles completed.
2. **Given** a session stopped before completion, **When** the user opens History, **Then** the entry reflects the partial progress actually reached (not a full completion).
3. **Given** one or more history entries, **When** the user deletes a single entry, **Then** only that entry is removed and the rest remain.
4. **Given** one or more history entries, **When** the user chooses "Clear history", **Then** all entries are removed after the user confirms the action.

---

### User Story 4 - Adjust sound and feedback settings (Priority: P3)

A user wants the timer's audio/haptic feedback to suit their environment (e.g., silence it in a shared space, or enable vibration when the phone is on a rack).

**Why this priority**: Improves comfort and usability across environments but the timer is fully usable with default settings without it.

**Independent Test**: Can be fully tested by opening Settings, toggling sound off, running a session, and confirming no audio plays while visual phase changes still occur correctly; then re-enabling sound and confirming audio returns.

**Acceptance Scenarios**:

1. **Given** the Settings screen, **When** the user turns off "Sound effects" and starts any session, **Then** no audio cues play during phase transitions, while visual transitions continue normally.
2. **Given** the Settings screen, **When** the user selects a different sound preset and starts a session, **Then** phase-transition cues use the newly selected sound.
3. **Given** the Settings screen, **When** the user adjusts the volume slider, **Then** subsequent audio cues play at the selected volume.
4. **Given** a device that supports vibration, **When** the user enables "Vibration" and a phase transition occurs during a session, **Then** the device vibrates briefly at that transition; on a device/browser without vibration support, the setting has no effect and produces no error.
5. **Given** the Settings screen, **When** the user changes any setting, **Then** the new value persists across future sessions and app restarts (same browser/device).

---

### Edge Cases

- What happens when all interval durations and round/cycle counts are left at minimal values (e.g., 0 seconds, 1 round)? The session must still start and immediately reach a defined end state without errors or divide-by-zero/infinite-loop behavior.
- How does the system handle a custom workout with Rounds or Cycles set to a very large number (e.g., 99)? The session must still run correctly; remaining-rounds/cycles counters must display large numbers without breaking layout.
- What happens if the user rapidly presses Play/Pause or navigation arrows in quick succession? The displayed phase/time must remain consistent with the true elapsed time — no skipped, duplicated, or stuck phases.
- What happens when the browser denies microphone/audio autoplay before any user interaction? The first sound should be deferred until the user has interacted with the page (e.g., pressing Start counts as interaction), and the absence of earlier sound must not break the timer.
- What happens if local storage is full, disabled, or blocked (e.g., private browsing)? The app must still allow running a timer session in the current tab; saving a custom workout, settings, or history may fail gracefully with a visible message rather than crashing.
- What happens when the user reloads the page mid-session? Reasonable behavior is to use the URL's reflected session configuration to let the user re-launch the configuration, without guaranteeing resumption of the exact mid-phase countdown.
- What happens when a Stopwatch session's configured "lap"/rest interval is set to 0? The system should treat this as "no automatic lap marking" rather than looping continuously.
- What happens when the device orientation changes mid-session? The session must continue counting down uninterrupted while the layout reflows between portrait and landscape arrangements.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide four distinct timer modes accessible from a persistent bottom navigation: Tabata, Rounds, Stopwatch, and Plus (custom workouts).
- **FR-002**: In Tabata mode, the system MUST support configuring Prepare, Exercise, Rest, Rounds (exercise+rest repetitions per cycle), Cycles (repetitions of the full round sequence), Rest-between-cycles, and Cooldown durations, and MUST run them in that structured order.
- **FR-003**: In Rounds mode, the system MUST support configuring Prepare, Exercise, Rest, and a number of Rounds, running Exercise/Rest alternation for that many rounds without a cycle concept.
- **FR-004**: In Stopwatch mode, the system MUST support an ascending timer with a configurable "lap"/rest interval, running until the user manually stops it.
- **FR-005**: The system MUST visually distinguish each phase using a full-screen color treatment consistent across modes (Prepare = yellow/amber, Exercise/Work = green, Rest = red), with the current phase's remaining time shown in large, high-contrast digits.
- **FR-006**: The session screen MUST display the phase that will follow the current one ("up next") and MUST display counters for rounds remaining and (where applicable) cycles remaining.
- **FR-007**: The session screen MUST provide Play/Pause, Reset, manual forward/backward phase navigation, and quick access to Settings and History.
- **FR-008**: The system MUST adapt the session screen layout for both portrait and landscape device orientation without interrupting an in-progress countdown.
- **FR-009**: The system MUST compute all displayed countdown/elapsed values from real elapsed time (wall-clock timestamps) captured at phase start, recalculated on every render and whenever the app regains foreground/visibility after being backgrounded, so that no drift accumulates regardless of background throttling.
- **FR-010**: The system MUST play a short, distinguishable audio cue at the start of each phase transition when sound effects are enabled in Settings, and MUST NOT play audio when disabled.
- **FR-011**: The system MUST attempt to acquire a screen wake lock during an active session and MUST continue operating correctly (without blocking errors) on browsers/devices where wake lock is unavailable.
- **FR-012**: The system MUST attempt to trigger a brief device vibration at phase transitions when vibration is enabled in Settings, and MUST continue operating correctly where vibration is unavailable.
- **FR-013**: Users MUST be able to create, edit, duplicate, and delete named custom workouts, each with an associated color and full interval configuration (Prepare, Exercise, Rest, Rounds, Cycles, Rest-between-cycles, Cooldown).
- **FR-014**: The system MUST persist custom workouts and all Settings values durably on the device (surviving a page reload and browser restart) without requiring any user account or network connection.
- **FR-015**: The system MUST reflect the active session's mode and configuration values in the page's URL query parameters in real time, such that reloading the page or opening the same URL restores the same configuration.
- **FR-016**: The system MUST record a history entry whenever a session ends (whether completed in full or stopped early), capturing the workout name/mode, date and time, total elapsed duration, and rounds/cycles actually completed.
- **FR-017**: Users MUST be able to view, delete a single history entry, and clear all history entries.
- **FR-018**: The Settings screen MUST allow the user to toggle sound effects, choose among multiple short-sound presets, adjust playback volume, toggle a per-second tick/click sound, and toggle vibration.
- **FR-019**: The system MUST be installable as a Progressive Web App (addable to home screen) and MUST remain usable for previously-visited screens when offline, after at least one prior online visit.
- **FR-020**: The system MUST NOT require any heart-rate sensor, Bluetooth device, user account, server-side storage, or voice-synthesis feature; all behavior described above must work without any of these.
- **FR-021**: The system's UI text MUST be presented in English only for this version.
- **FR-022**: The Settings screen MUST provide a single "Fun mode" toggle (default off) that, when enabled, adds purely decorative/motivational feedback — an animated progress indicator and bouncy countdown digit during a session, and a brief celebratory animation when a session is completed in full (not on an early stop) — without altering any timer, round, or cycle behavior.
- **FR-023**: The Settings screen MUST let the user customize the Prepare/Exercise/Rest phase colors from FR-005, offering at least 5 named color-trio presets (one themed after Olympique de Marseille) plus an individual custom color picker per phase.

### Key Entities

- **Workout Template**: A named, reusable interval configuration — attributes: name, color, mode (Tabata/Rounds/Stopwatch-style), Prepare duration, Exercise duration, Rest duration, Rounds count, Cycles count, Rest-between-cycles duration, Cooldown duration. User-created templates are stored durably; built-in mode defaults are not user-deletable but are copyable into a new custom template.
- **Session**: A single run-through of a Workout Template or ad-hoc mode configuration — attributes: which template/mode was used, start time, current phase, elapsed/remaining time, rounds/cycles completed so far, paused/running/finished state. Exists only while active; on completion or stop it produces a History Entry.
- **History Entry**: A persisted record of a finished or stopped Session — attributes: workout name/mode, date/time, total duration, rounds completed, cycles completed, completion status (finished vs. stopped early).
- **Settings**: A single persisted set of user preferences — attributes: sound effects on/off, selected sound preset, volume level, tick sound on/off, vibration on/off.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can start a default Tabata session within 10 seconds of opening the app, with no configuration required.
- **SC-002**: Across a 10-minute continuous session with the device screen locked/unlocked repeatedly, the displayed countdown never deviates from true elapsed wall-clock time by more than 1 second.
- **SC-003**: A user can create a custom workout and launch it again in a later visit in under 30 seconds, with zero data loss of the saved configuration.
- **SC-004**: 100% of completed or stopped sessions produce exactly one corresponding history entry with accurate duration and round/cycle counts.
- **SC-005**: The app's primary timer functionality (starting, running, and completing a session) remains fully operable with no console errors on a device with no network connectivity after one prior successful load.
- **SC-006**: Users can reach and use the session screen, the workout editor, Settings, and History each within 2 taps/clicks from the main navigation.

## Assumptions

- Target users are on modern evergreen mobile and desktop browsers (recent Chrome, Safari, Firefox, Edge); no support is required for legacy browsers that lack `localStorage` or the Page Visibility API.
- "Built-in" Tabata/Rounds/Stopwatch modes ship with reasonable default interval values (e.g., 20s work / 10s rest) that the user can adjust per-session without necessarily saving them as a named custom workout.
- A single device/browser profile is assumed per user; there is no cross-device sync, consistent with the no-backend, no-account constraint.
- Audio cues are short synthesized or pre-bundled sound effects (beeps/chimes), not spoken words, per the explicit exclusion of voice synthesis.
- "Offline usable after one prior visit" means the app shell and previously loaded screens work offline; it does not imply the user can install new custom workouts while fully offline on a first-ever visit with no cache.
- Wake Lock, Vibration, and background-tab timer accuracy are best-effort: the feature must never error or block core functionality when an API is unsupported, but perfect behavior (e.g., guaranteed non-dimming screen) cannot be guaranteed on every browser/OS combination (notably iOS Safari's historical limitations).
