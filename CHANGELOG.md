# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added
- **Encouragement mode** (Settings): optional toggle plus a first-name field. When enabled, a
  random motivational message (English, optionally personalized, e.g. "Let's go, Alex!") appears
  at 25%, 50%, and 75% elapsed through each Exercise phase, as a non-blocking banner under the top
  bar so it never covers the countdown. Ten message variants, playful bounce-in/bounce-out
  animation, bold stencil display font ("Black Ops One").
- A dedicated, configurable color for the Rest-between-cycles phase (`cycleRest`), distinct from
  the ordinary between-round Rest color, across all 5 phase-color presets.
- Completion overlay now shows both "Total time" and "Time worked": "Total time" is the sum of
  the *configured* Exercise + Rest + Rest-between-cycles + Cooldown durations (excludes Prepare;
  falls back to actual elapsed time for Stopwatch, which has no fixed total), and "Time worked" is
  the time actually spent in Exercise phases (or the ascending run for Stopwatch) — saved on each
  history entry as `workedDurationMs`.

- 5 new sound presets (`boxing`, `zen`, `deep`, `chime`, `retro`) alongside the original `classic`/
  `digital`/`arcade`, each with its own distinct character.

### Changed
- Sound presets now play a real mp3 sample (`assets/sounds/<preset>.mp3`, not bundled — see that
  folder's README for free, no-attribution sources) instead of a synthesized tone, pitch-shifted
  slightly per phase (Prepare/Exercise/Rest/Cooldown/tick) so one short clip covers a whole preset.
  Falls back to the original oscillator beep if a preset's file is missing or fails to load.

### Fixed
- Tabata: the final Exercise phase's rest could be skipped when it shouldn't have been; the
  phase-sequence builder now only skips it when a cycle-rest or cooldown immediately follows.
- Sound cues not playing on iOS: an earlier attempt to synthesize richer tones via Tone.js, loaded
  through a dynamic `import()`, resumed the AudioContext asynchronously — iOS Safari revokes the
  "user activation" needed for audio before that resolves. The AudioContext is now created/resumed
  synchronously inside the triggering gesture handler, as it always should have been.

## [0.1.0] - 2026-10-28

### Added
- Initial release: Tabata, Rounds, Stopwatch, and custom ("Plus") interval workouts.
- Fullscreen color-coded session screen, workout history, Settings (sound/vibration), Fun mode,
  configurable phase colors, SVG icon set, and service-worker-based offline support.
