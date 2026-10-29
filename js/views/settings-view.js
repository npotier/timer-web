// Re-exports the sound preset list so the Settings screen has a single source of truth for the
// <select> options (defined in audio.js, which owns the actual oscillator frequencies).
export { SOUND_PRESETS } from '../audio.js';

export function formatVolumePercent(volume) {
  return `${Math.round((Number(volume) || 0) * 100)}%`;
}

// Encouragement messages (Settings → Encouragement), shown during a session at 25/50/75% of the
// current Exercise phase's elapsed duration. A '{name}' placeholder is filled in with the user's
// first name when set; messages without it also work when no name was given.
export const ENCOURAGEMENT_MESSAGES = [
  'Come on, you can do it!',
  "Let's go, {name}!",
  "You're crushing it, {name}!",
  'Keep pushing, stay strong!',
  "You've got this, {name}!",
  'Halfway there, keep going!',
  "Don't give up now, {name}!",
  'Nice pace, keep it up!',
  'Almost there, finish strong!',
  "{name}, you're unstoppable!",
];

export function pickEncouragementMessage(name) {
  const trimmedName = (name || '').trim();
  const pool = ENCOURAGEMENT_MESSAGES.filter((m) => trimmedName || !m.includes('{name}'));
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace('{name}', trimmedName);
}
