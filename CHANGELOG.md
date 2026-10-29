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

### Fixed
- Tabata: the final Exercise phase's rest could be skipped when it shouldn't have been; the
  phase-sequence builder now only skips it when a cycle-rest or cooldown immediately follows.

## [0.1.0] - 2026-10-28

### Added
- Initial release: Tabata, Rounds, Stopwatch, and custom ("Plus") interval workouts.
- Fullscreen color-coded session screen, workout history, Settings (sound/vibration), Fun mode,
  configurable phase colors, SVG icon set, and service-worker-based offline support.
