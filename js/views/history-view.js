import { formatElapsed } from './session-view.js';

export function formatHistoryEntry(entry) {
  const date = new Date(entry.completedAt);
  const dateLabel = Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const durationLabel = formatElapsed(entry.totalDurationMs);
  const progressLabel = entry.mode === 'tabata'
    ? `${entry.roundsCompleted} rounds · ${entry.cyclesCompleted} cycles`
    : `${entry.roundsCompleted} rounds`;
  return { dateLabel, durationLabel, progressLabel };
}
