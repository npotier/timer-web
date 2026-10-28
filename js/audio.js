// Web Audio cues. No voice synthesis (explicit scope exclusion) — short synthesized tones only,
// so no binary sound assets are needed. Initialization is deferred to the first user gesture
// (Start button press) to satisfy browser autoplay policies. Any failure degrades to a silent
// no-op rather than throwing, per the constitution's progressive-enhancement requirement.

const PRESETS = {
  classic: { prepare: 660, exercise: 880, rest: 440, cooldown: 523, tick: 1000 },
  digital: { prepare: 784, exercise: 1046, rest: 392, cooldown: 659, tick: 1200 },
  arcade: { prepare: 494, exercise: 988, rest: 330, cooldown: 622, tick: 1500 },
};

const CUE_FREQUENCY_BY_PHASE = {
  prepare: 'prepare',
  exercise: 'exercise',
  rest: 'rest',
  'rest-between-cycles': 'rest',
  cooldown: 'cooldown',
  'stopwatch-run': 'exercise',
};

let audioCtx = null;

export function initOnFirstGesture() {
  if (audioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (err) {
    console.warn('audio: init failed, sounds disabled', err);
    audioCtx = null;
  }
}

function playTone(frequency, durationMs, volume) {
  if (!audioCtx) return;
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = Math.max(0, Math.min(1, volume));
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    oscillator.start(now);
    oscillator.stop(now + durationMs / 1000);
  } catch (err) {
    console.warn('audio: playback failed', err);
  }
}

export function playCue(phaseType, settings) {
  if (!settings || !settings.soundEnabled) return;
  const preset = PRESETS[settings.soundPreset] || PRESETS.classic;
  const key = CUE_FREQUENCY_BY_PHASE[phaseType] || 'exercise';
  playTone(preset[key], 220, settings.volume ?? 0.8);
}

export function playTick(settings) {
  if (!settings || !settings.soundEnabled || !settings.tickSoundEnabled) return;
  const preset = PRESETS[settings.soundPreset] || PRESETS.classic;
  playTone(preset.tick, 60, (settings.volume ?? 0.8) * 0.5);
}

export const SOUND_PRESETS = Object.keys(PRESETS);
