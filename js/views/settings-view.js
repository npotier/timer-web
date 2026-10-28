// Re-exports the sound preset list so the Settings screen has a single source of truth for the
// <select> options (defined in audio.js, which owns the actual oscillator frequencies).
export { SOUND_PRESETS } from '../audio.js';

export function formatVolumePercent(volume) {
  return `${Math.round((Number(volume) || 0) * 100)}%`;
}
