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

// Maps each session phase to one of the three user-configurable Settings.phaseColors (FR-005,
// FR-023): Prepare keeps its own color; Rest-between-cycles and Cooldown reuse Rest (same
// "not working" meaning); Stopwatch's running phase reuses Exercise (the "go" color).
const PHASE_COLOR_KEY = {
  prepare: 'prepare',
  exercise: 'exercise',
  rest: 'rest',
  'rest-between-cycles': 'rest',
  cooldown: 'rest',
  'stopwatch-run': 'exercise',
};

export function phaseLabel(phaseType) {
  return PHASE_LABELS[phaseType] || '';
}

/** Hex background color for a phase, from the user's configured Settings.phaseColors. */
export function phaseBackgroundColor(phaseType, phaseColors) {
  const key = PHASE_COLOR_KEY[phaseType] || 'exercise';
  return (phaseColors && phaseColors[key]) || '#27272a';
}

/** Perceptual-luminance-based black/white text color so any custom phase color stays readable. */
export function contrastTextColor(hexColor) {
  const hex = (hexColor || '').replace('#', '');
  if (hex.length !== 6) return '#000000';
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/** Inline style object for the fullscreen phase background + readable text color. */
export function phaseStyle(phaseType, phaseColors) {
  const background = phaseBackgroundColor(phaseType, phaseColors);
  return { backgroundColor: background, color: contrastTextColor(background) };
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
