// Pure presentation helpers for the fullscreen session screen. Kept framework-agnostic so they
// can be unit-tested from the console independently of Alpine.js bindings in index.html.

export const PHASE_LABELS = {
  prepare: 'PREPARE',
  exercise: 'WORK',
  rest: 'REST',
  'rest-between-cycles': 'REST',
  cooldown: 'COOLDOWN',
  'stopwatch-run': 'GO',
};

// Tailwind utility classes per phase, matching the reference app's color language
// (FR-005: Prepare = yellow/amber, Exercise/Work = green, Rest = red).
export const PHASE_COLOR_CLASSES = {
  prepare: 'bg-yellow-400 text-black',
  exercise: 'bg-lime-400 text-black',
  rest: 'bg-red-500 text-white',
  'rest-between-cycles': 'bg-yellow-400 text-black',
  cooldown: 'bg-sky-400 text-black',
  'stopwatch-run': 'bg-lime-400 text-black',
};

export function phaseLabel(phaseType) {
  return PHASE_LABELS[phaseType] || '';
}

export function phaseColorClasses(phaseType) {
  return PHASE_COLOR_CLASSES[phaseType] || 'bg-zinc-800 text-white';
}

/** Format milliseconds as a countdown string: M:SS, or H:MM:SS past one hour. */
export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Format elapsed time (counting up) the same way, used by the Stopwatch mode. */
export function formatElapsed(ms) {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

// --- "Fun mode" progress ring (Settings.funMode) ---
// Purely decorative/motivational; the countdown digits remain the source of truth for timing
// (constitution Principle II) — the ring is derived from the same sessionState each tick, never
// an independent timer.
export const RING_RADIUS = 46;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Fraction of the current phase remaining, in [0, 1]. Infinite-duration phases (stopwatch) → 1. */
export function phaseRemainingFraction(currentPhase, remainingMs) {
  if (!currentPhase || !Number.isFinite(currentPhase.durationMs) || currentPhase.durationMs <= 0) {
    return 1;
  }
  return Math.max(0, Math.min(1, remainingMs / currentPhase.durationMs));
}

/** SVG stroke-dashoffset so the ring depletes (empties) as the phase's remaining time runs out. */
export function ringDashoffset(currentPhase, remainingMs) {
  const remainingFraction = phaseRemainingFraction(currentPhase, remainingMs);
  return RING_CIRCUMFERENCE * (1 - remainingFraction);
}
