// Vibration API wrapper. No-op (never throws) when unsupported or disabled in Settings — see
// constitution Principle III (PWA Resilience: progressive enhancement must degrade silently).

export function vibrate(patternMs, settings) {
  if (!settings || !settings.vibrationEnabled) return false;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  try {
    return navigator.vibrate(patternMs);
  } catch (err) {
    console.warn('haptics: vibrate failed', err);
    return false;
  }
}
