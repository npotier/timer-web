// Dependency-free timer/session state machine.
// Timer Accuracy (constitution Principle II): every remaining-time value is derived from
// Date.now() deltas against a stored phase-start timestamp — never from an accumulated counter.
// This makes the engine immune to setInterval throttling/suspension in backgrounded tabs: calling
// getState() at any moment (including long after the tab was hidden) returns the true phase, with
// resync() catching the display up by skipping any phases whose duration has already elapsed.

export const PHASE_TYPES = Object.freeze({
  PREPARE: 'prepare',
  EXERCISE: 'exercise',
  REST: 'rest',
  REST_BETWEEN_CYCLES: 'rest-between-cycles',
  COOLDOWN: 'cooldown',
  STOPWATCH_RUN: 'stopwatch-run',
});

export const SESSION_STATUS = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  FINISHED: 'finished',
  STOPPED: 'stopped',
});

/**
 * Build a flat phase sequence for a finite (tabata/rounds) workout template.
 * Each phase: { type, durationMs, roundNumber, cycleNumber }
 */
export function buildPhaseSequence(template) {
  const phases = [];
  const prepareMs = Math.max(0, Number(template.prepareSec) || 0) * 1000;
  const exerciseMs = Math.max(1, Number(template.exerciseSec) || 1) * 1000;
  const restMs = Math.max(0, Number(template.restSec) || 0) * 1000;
  const rounds = Math.max(1, Number(template.rounds) || 1);
  const cycles = template.mode === 'tabata' ? Math.max(1, Number(template.cycles) || 1) : 1;
  const restBetweenCyclesMs = Math.max(0, Number(template.restBetweenCyclesSec) || 0) * 1000;
  const cooldownMs = Math.max(0, Number(template.cooldownSec) || 0) * 1000;

  if (prepareMs > 0) {
    phases.push({ type: PHASE_TYPES.PREPARE, durationMs: prepareMs, roundNumber: 0, cycleNumber: 1 });
  }

  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    for (let round = 1; round <= rounds; round += 1) {
      phases.push({ type: PHASE_TYPES.EXERCISE, durationMs: exerciseMs, roundNumber: round, cycleNumber: cycle });
      const isLastRoundOfCycle = round === rounds;
      const isVeryLastRound = isLastRoundOfCycle && cycle === cycles;
      // A round-rest (REST_BETWEEN_CYCLES) will follow this cycle, so no exercise-rest here too.
      const willHaveCycleRest = template.mode === 'tabata' && cycle < cycles && restBetweenCyclesMs > 0;
      const skipExerciseRest = isLastRoundOfCycle
        && (willHaveCycleRest || (isVeryLastRound && cooldownMs > 0));
      if (restMs > 0 && !skipExerciseRest) {
        phases.push({ type: PHASE_TYPES.REST, durationMs: restMs, roundNumber: round, cycleNumber: cycle });
      }
    }
    if (template.mode === 'tabata' && cycle < cycles && restBetweenCyclesMs > 0) {
      phases.push({ type: PHASE_TYPES.REST_BETWEEN_CYCLES, durationMs: restBetweenCyclesMs, roundNumber: 0, cycleNumber: cycle });
    }
  }

  if (cooldownMs > 0) {
    phases.push({ type: PHASE_TYPES.COOLDOWN, durationMs: cooldownMs, roundNumber: 0, cycleNumber: cycles });
  }

  // Guarantee at least one phase so a degenerate all-zero template still runs and ends cleanly.
  if (phases.length === 0) {
    phases.push({ type: PHASE_TYPES.EXERCISE, durationMs: exerciseMs, roundNumber: 1, cycleNumber: 1 });
  }

  return phases;
}

export class TimerEngine {
  constructor() {
    this._listeners = { phaseChange: [], tick: [], sessionEnd: [] };
    this._reset();
  }

  _reset() {
    this.template = null;
    this.phaseSequence = [];
    this.currentPhaseIndex = 0;
    this.phaseStartTimestamp = 0;
    this.pausedElapsedMs = 0;
    this.pausedAt = null;
    this.status = SESSION_STATUS.IDLE;
    this.roundsCompleted = 0;
    this.cyclesCompleted = 0;
    this.sessionStartedAt = null;
    // Stopwatch-only state: ascending, no fixed phase sequence.
    this.isStopwatch = false;
    this.lapDurationMs = 0;
  }

  on(event, cb) {
    if (this._listeners[event]) this._listeners[event].push(cb);
  }

  _emit(event, payload) {
    (this._listeners[event] || []).forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`timer-engine listener error (${event})`, err);
      }
    });
  }

  start(template) {
    this._reset();
    this.template = template;
    this.isStopwatch = template.mode === 'stopwatch';
    this.sessionStartedAt = Date.now();

    if (this.isStopwatch) {
      this.lapDurationMs = Math.max(0, Number(template.restSec) || 0) * 1000;
      const prepareMs = Math.max(0, Number(template.prepareSec) || 0) * 1000;
      this.phaseSequence = prepareMs > 0
        ? [{ type: PHASE_TYPES.PREPARE, durationMs: prepareMs, roundNumber: 0, cycleNumber: 1 }]
        : [{ type: PHASE_TYPES.STOPWATCH_RUN, durationMs: Infinity, roundNumber: 0, cycleNumber: 1 }];
      if (prepareMs > 0) {
        // The ascending run phase is appended once prepare elapses (see resync()).
        this._stopwatchPending = true;
      }
    } else {
      this.phaseSequence = buildPhaseSequence(template);
    }

    this.currentPhaseIndex = 0;
    this.phaseStartTimestamp = Date.now();
    this.status = SESSION_STATUS.RUNNING;
    this._emit('phaseChange', this.getState());
    return this.getState();
  }

  pause() {
    if (this.status !== SESSION_STATUS.RUNNING) return this.getState();
    this.pausedAt = Date.now();
    this.status = SESSION_STATUS.PAUSED;
    return this.getState();
  }

  resume() {
    if (this.status !== SESSION_STATUS.PAUSED) return this.getState();
    const pauseDuration = Date.now() - this.pausedAt;
    this.phaseStartTimestamp += pauseDuration;
    this.pausedAt = null;
    this.status = SESSION_STATUS.RUNNING;
    return this.getState();
  }

  stop() {
    if (this.status === SESSION_STATUS.IDLE) return this.getState();
    this.status = SESSION_STATUS.STOPPED;
    this._emit('sessionEnd', this.getState());
    return this.getState();
  }

  _advanceTo(index) {
    const prevPhase = this.phaseSequence[this.currentPhaseIndex];
    if (prevPhase) {
      if (prevPhase.type === PHASE_TYPES.EXERCISE) {
        // A round is "completed" once its exercise phase has fully elapsed.
      }
      if (prevPhase.type === PHASE_TYPES.REST || prevPhase.type === PHASE_TYPES.EXERCISE) {
        this.roundsCompleted = Math.max(this.roundsCompleted, prevPhase.roundNumber || 0);
      }
      if (prevPhase.type === PHASE_TYPES.REST_BETWEEN_CYCLES || prevPhase.type === PHASE_TYPES.COOLDOWN) {
        this.cyclesCompleted = Math.max(this.cyclesCompleted, prevPhase.cycleNumber || 0);
      }
    }

    if (index >= this.phaseSequence.length) {
      if (this.isStopwatch) {
        // Stopwatch never "finishes" on its own; it is stopped manually.
        return;
      }
      this.cyclesCompleted = this.template ? Math.max(1, Number(this.template.cycles) || 1) : this.cyclesCompleted;
      this.status = SESSION_STATUS.FINISHED;
      this.currentPhaseIndex = this.phaseSequence.length - 1;
      this._emit('sessionEnd', this.getState());
      return;
    }

    this.currentPhaseIndex = Math.max(0, index);
    this.phaseStartTimestamp = Date.now();
    this._emit('phaseChange', this.getState());
  }

  nextPhase() {
    if (this.status === SESSION_STATUS.FINISHED || this.status === SESSION_STATUS.STOPPED) return this.getState();
    this._advanceTo(this.currentPhaseIndex + 1);
    return this.getState();
  }

  previousPhase() {
    if (this.status === SESSION_STATUS.FINISHED || this.status === SESSION_STATUS.STOPPED) return this.getState();
    this._advanceTo(Math.max(0, this.currentPhaseIndex - 1));
    return this.getState();
  }

  /**
   * Recompute state from real elapsed time. Call this on every render tick and on every
   * visibilitychange/focus event so a backgrounded tab never shows a stale value — it must
   * "catch up" by skipping any phases whose duration has already fully elapsed.
   */
  resync() {
    if (this.status !== SESSION_STATUS.RUNNING) return this.getState();

    if (this.isStopwatch) {
      const currentPhase = this.phaseSequence[this.currentPhaseIndex];
      if (currentPhase && currentPhase.type === PHASE_TYPES.PREPARE) {
        const elapsed = Date.now() - this.phaseStartTimestamp;
        if (elapsed >= currentPhase.durationMs) {
          this.phaseSequence.push({ type: PHASE_TYPES.STOPWATCH_RUN, durationMs: Infinity, roundNumber: 0, cycleNumber: 1 });
          this._advanceTo(this.currentPhaseIndex + 1);
        }
      }
      return this.getState();
    }

    // Guard against runaway loops on pathological data; the spec's degenerate-template edge
    // case is handled by buildPhaseSequence guaranteeing durationMs > 0 for at least one phase.
    let safety = this.phaseSequence.length + 2;
    while (safety > 0) {
      const currentPhase = this.phaseSequence[this.currentPhaseIndex];
      if (!currentPhase) break;
      const elapsed = Date.now() - this.phaseStartTimestamp;
      if (elapsed < currentPhase.durationMs) break;
      this._advanceTo(this.currentPhaseIndex + 1);
      if (this.status !== SESSION_STATUS.RUNNING) break;
      safety -= 1;
    }
    return this.getState();
  }

  getState() {
    const currentPhase = this.phaseSequence[this.currentPhaseIndex] || null;
    const nextPhase = this.phaseSequence[this.currentPhaseIndex + 1] || null;

    let elapsedInPhaseMs = 0;
    let remainingMs = currentPhase ? currentPhase.durationMs : 0;

    if (currentPhase) {
      const now = this.status === SESSION_STATUS.PAUSED ? this.pausedAt : Date.now();
      elapsedInPhaseMs = Math.max(0, now - this.phaseStartTimestamp);
      remainingMs = this.isStopwatch && currentPhase.type === PHASE_TYPES.STOPWATCH_RUN
        ? Infinity
        : Math.max(0, currentPhase.durationMs - elapsedInPhaseMs);
    }

    const totalDurationMs = this.sessionStartedAt
      ? (this.status === SESSION_STATUS.PAUSED ? this.pausedAt : Date.now()) - this.sessionStartedAt
      : 0;

    const totalRounds = this.template ? Math.max(1, Number(this.template.rounds) || 1) : 0;
    const totalCycles = this.template && this.template.mode === 'tabata' ? Math.max(1, Number(this.template.cycles) || 1) : 1;

    return {
      status: this.status,
      mode: this.template ? this.template.mode : null,
      currentPhase,
      nextPhase,
      currentPhaseIndex: this.currentPhaseIndex,
      elapsedInPhaseMs,
      remainingMs,
      elapsedStopwatchMs: this.isStopwatch ? elapsedInPhaseMs : null,
      lapDurationMs: this.lapDurationMs,
      roundsCompleted: this.roundsCompleted,
      cyclesCompleted: this.cyclesCompleted,
      roundsRemaining: currentPhase ? Math.max(0, totalRounds - (currentPhase.roundNumber || 0) + (currentPhase.type === PHASE_TYPES.EXERCISE || currentPhase.type === PHASE_TYPES.REST ? 1 : 0)) : totalRounds,
      cyclesRemaining: currentPhase ? Math.max(0, totalCycles - (currentPhase.cycleNumber || 1) + 1) : totalCycles,
      totalDurationMs,
    };
  }
}
