// Screen Wake Lock wrapper. Best-effort only (constitution Principle III): resolves to a no-op
// with no thrown error when the API is undefined or the request rejects (e.g. iOS Safari before
// support landed). Re-acquires automatically when the tab becomes visible again while a session
// is still running.

let wakeLockSentinel = null;
let shouldHoldLock = false;

async function acquire() {
  if (typeof navigator === 'undefined' || !navigator.wakeLock) return;
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
  } catch (err) {
    // Common and expected on unsupported browsers or when the tab isn't visible; never throw.
    wakeLockSentinel = null;
  }
}

export async function requestWakeLock() {
  shouldHoldLock = true;
  await acquire();
}

export async function releaseWakeLock() {
  shouldHoldLock = false;
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (err) {
      // ignore
    }
    wakeLockSentinel = null;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && shouldHoldLock && !wakeLockSentinel) {
      acquire();
    }
  });
}
