// Web Audio cues. No voice synthesis (explicit scope exclusion). Initialization is deferred to
// the first user gesture (Start button press, or picking a sound preset) to satisfy browser
// autoplay policies — critically, the AudioContext is created/resumed SYNCHRONOUSLY inside that
// gesture handler (see initOnFirstGesture), never behind an async import or fetch. iOS Safari
// revokes "user activation" the instant control returns to the event loop, so anything async in
// that chain (a dynamic `import()`, a network fetch before the first `resume()`) silently breaks
// sound on iPhone/iPad even though it works fine on desktop — this was the cause of a prior
// Tone.js-based implementation not working on iOS.
//
// Each preset plays a real mp3 (assets/sounds/<preset>.mp3), decoded once into an AudioBuffer and
// reused. Phase-to-phase variety for a single preset comes from pitch-shifting that one buffer via
// `playbackRate` rather than requiring a separate file per phase. If a preset's mp3 is missing, 404s,
// or fails to decode (e.g. this preset's file hasn't been added to assets/sounds/ yet), playback
// falls back to the original plain oscillator beep — sound never breaks a session, per the
// progressive-enhancement approach used elsewhere (Fun mode, Wake Lock, Vibration, confetti).

const BASE_FREQUENCY_BY_PRESET = {
  classic: 880,
  digital: 1046,
  arcade: 988,
  boxing: 740,
  zen: 659,
  deep: 220,
  chime: 1318,
  retro: 1318,
};

export const SOUND_PRESETS = Object.keys(BASE_FREQUENCY_BY_PRESET);

const SOUND_FILE_BY_PRESET = Object.fromEntries(
  SOUND_PRESETS.map((preset) => [preset, `assets/sounds/${preset}.mp3`]),
);

// Relative pitch (playbackRate) and volume per phase, applied on top of a preset's one sample —
// higher/brighter for Prepare, full pitch for Exercise/the "go" phase, lower for Rest, a touch
// lower again for Cooldown. The per-second tick is pitched up and quiet.
const PHASE_VARIANT = {
  prepare: { rate: 1.15, gain: 0.9 },
  exercise: { rate: 1, gain: 1 },
  rest: { rate: 0.85, gain: 0.85 },
  'rest-between-cycles': { rate: 0.85, gain: 0.85 },
  cooldown: { rate: 0.95, gain: 0.85 },
  'stopwatch-run': { rate: 1, gain: 1 },
};
const TICK_VARIANT = { rate: 1.6, gain: 0.5 };

// --- Fallback: plain oscillator beep (always available, no file/network dependency) ---

let audioCtx = null;

function playFallbackTone(frequency, durationMs, volume) {
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
    console.warn('audio: fallback playback failed', err);
  }
}

// --- Real sample playback: one decoded AudioBuffer per preset, cached after first successful load ---

const bufferCache = {}; // presetName -> AudioBuffer | 'failed'

function loadBuffer(presetName) {
  if (bufferCache[presetName]) return;
  bufferCache[presetName] = 'loading';
  fetch(SOUND_FILE_BY_PRESET[presetName])
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.arrayBuffer();
    })
    .then((arrayBuffer) => audioCtx.decodeAudioData(arrayBuffer))
    .then((buffer) => { bufferCache[presetName] = buffer; })
    .catch((err) => {
      console.warn(`audio: no usable sound file for preset "${presetName}", using a plain beep instead`, err);
      bufferCache[presetName] = 'failed';
    });
}

function playBuffer(buffer, rate, gain, volume) {
  const source = audioCtx.createBufferSource();
  const gainNode = audioCtx.createGain();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  gainNode.gain.value = Math.max(0, Math.min(1, volume)) * gain;
  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  source.start();
}

export function initOnFirstGesture() {
  if (!audioCtx) {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      audioCtx = new AudioContextClass();
    } catch (err) {
      console.warn('audio: init failed, sounds disabled', err);
      audioCtx = null;
      return;
    }
  }
  if (audioCtx.state === 'suspended') {
    // Must be called synchronously within the gesture for iOS to honor it.
    audioCtx.resume().catch(() => {});
  }
  SOUND_PRESETS.forEach(loadBuffer);
}

function play(presetName, variant, fallbackFrequency, fallbackDurationMs, volume) {
  if (!audioCtx) return;
  const buffer = bufferCache[presetName];
  if (buffer && buffer !== 'loading' && buffer !== 'failed') {
    try {
      playBuffer(buffer, variant.rate, variant.gain, volume);
      return;
    } catch (err) {
      console.warn('audio: sample playback failed, falling back to a plain beep', err);
    }
  }
  playFallbackTone(fallbackFrequency * variant.rate, fallbackDurationMs, volume * variant.gain);
}

export function playCue(phaseType, settings) {
  if (!settings || !settings.soundEnabled) return;
  const presetName = BASE_FREQUENCY_BY_PRESET[settings.soundPreset] ? settings.soundPreset : 'classic';
  const variant = PHASE_VARIANT[phaseType] || PHASE_VARIANT.exercise;
  play(presetName, variant, BASE_FREQUENCY_BY_PRESET[presetName], 220, settings.volume ?? 0.8);
}

export function playTick(settings) {
  if (!settings || !settings.soundEnabled || !settings.tickSoundEnabled) return;
  const presetName = BASE_FREQUENCY_BY_PRESET[settings.soundPreset] ? settings.soundPreset : 'classic';
  play(presetName, TICK_VARIANT, BASE_FREQUENCY_BY_PRESET[presetName], 60, (settings.volume ?? 0.8) * 0.5);
}
