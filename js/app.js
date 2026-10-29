import Alpine from 'https://esm.sh/alpinejs@3.14.1';
import { TimerEngine, SESSION_STATUS } from './timer-engine.js';
import * as storage from './storage.js';
import * as audio from './audio.js';
import * as haptics from './haptics.js';
import * as wakelock from './wakelock.js';
import {
  phaseLabel, phaseStyle, formatDuration, formatElapsed, ringDashoffset, RING_CIRCUMFERENCE,
} from './views/session-view.js';
import { createEmptyTemplate, duplicateTemplate, validateTemplate } from './views/editor-view.js';
import { SOUND_PRESETS, formatVolumePercent, pickEncouragementMessage } from './views/settings-view.js';
import { PHASE_COLOR_PRESETS } from './storage.js';
import { formatHistoryEntry } from './views/history-view.js';
import { icon } from './icons.js';

function appRoot() {
  const engine = new TimerEngine();
  let tickHandle = null;
  let lastWholeSecond = null;
  let lastCountdownSecond = null;
  let pulseTimeoutHandle = null;
  let encouragementThresholdsShown = new Set();
  let encouragementTimeoutHandle = null;

  return {
    // --- state ---
    view: 'home', // 'home' | 'session' | 'editor' | 'settings' | 'history'
    activeTab: 'tabata', // 'tabata' | 'rounds' | 'stopwatch' | 'plus'
    templates: [],
    settings: storage.getSettings(),
    history: [],
    configDraft: {},
    // Never null: x-show (unlike x-if) keeps evaluating child bindings even while hidden, so a
    // null value here would throw on every keystroke/render before the editor is first opened.
    editingTemplate: createEmptyTemplate(),
    editingErrors: {},
    sessionState: engine.getState(),
    isLandscape: window.matchMedia('(orientation: landscape)').matches,
    soundPresets: SOUND_PRESETS,
    phaseColorPresets: PHASE_COLOR_PRESETS,
    pulseActive: false,
    ringCircumference: RING_CIRCUMFERENCE,
    encouragementMessage: null,

    // --- lifecycle ---
    init() {
      this.templates = storage.getTemplates();
      this.history = storage.getHistory();
      this._loadConfigFromURL();

      engine.on('phaseChange', (state) => this._onPhaseChange(state));
      engine.on('sessionEnd', (state) => this._onSessionEnd(state));

      window.matchMedia('(orientation: landscape)').addEventListener('change', (e) => {
        this.isLandscape = e.matches;
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.sessionState = engine.resync();
        }
      });

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch((err) => {
          console.warn('service worker registration failed', err);
        });
      }
    },

    _loadConfigFromURL() {
      const urlConfig = storage.readSessionConfigFromURL();
      if (urlConfig.mode) this.activeTab = urlConfig.mode;
      this._syncConfigDraftFromTemplate(urlConfig);
    },

    // --- builtin-tab configuration ---
    get builtinTemplateForActiveTab() {
      const id = `builtin-${this.activeTab}`;
      return this.templates.find((t) => t.id === id) || null;
    },

    _syncConfigDraftFromTemplate(overrides = {}) {
      const base = this.builtinTemplateForActiveTab;
      if (!base) return;
      this.configDraft = { ...base, ...overrides };
    },

    onTabChange(tab) {
      this.activeTab = tab;
      if (tab !== 'plus') this._syncConfigDraftFromTemplate();
      this._writeURL();
    },

    onConfigDraftChange() {
      // Persist durably to localStorage (not just the URL) so a reload with no query string
      // still restores the last-used durations/rounds/cycles for this builtin mode.
      const result = storage.saveTemplate({ ...this.configDraft, id: `builtin-${this.activeTab}`, mode: this.activeTab, isBuiltin: true });
      if (result.ok) this.templates = storage.getTemplates();
      this._writeURL();
    },

    _writeURL() {
      if (this.activeTab === 'plus') {
        storage.writeSessionConfigToURL({ mode: 'plus' });
        return;
      }
      storage.writeSessionConfigToURL({ mode: this.activeTab, ...this.configDraft });
    },

    // --- session control ---
    startSession(template) {
      audio.initOnFirstGesture();
      this.sessionState = engine.start(template);
      this.view = 'session';
      wakelock.requestWakeLock();
      this._startTickLoop();
    },

    startBuiltinSession() {
      this.startSession({ ...this.configDraft, mode: this.activeTab });
    },

    launchTemplate(template) {
      this.startSession(template);
    },

    _startTickLoop() {
      this._stopTickLoop();
      lastWholeSecond = null;
      lastCountdownSecond = null;
      tickHandle = window.setInterval(() => {
        this.sessionState = engine.resync();
        this._maybePulse();
        this._maybeCountdownBeep();
        this._maybeEncourage();
        if (this.sessionState.status === SESSION_STATUS.FINISHED || this.sessionState.status === SESSION_STATUS.STOPPED) {
          this._stopTickLoop();
        }
      }, 200);
    },

    _stopTickLoop() {
      if (tickHandle) {
        window.clearInterval(tickHandle);
        tickHandle = null;
      }
    },

    // Fun mode: briefly scale the countdown digit each time the displayed whole second changes.
    // Purely decorative — never affects sessionState/timing (constitution Principle II).
    _maybePulse() {
      if (!this.settings.funMode) return;
      const phase = this.sessionState.currentPhase;
      if (!phase) return;
      const ms = phase.type === 'stopwatch-run' ? this.sessionState.elapsedStopwatchMs : this.sessionState.remainingMs;
      const wholeSecond = Math.ceil(ms / 1000);
      if (wholeSecond === lastWholeSecond) return;
      lastWholeSecond = wholeSecond;
      this.pulseActive = false;
      // Force a reflow so re-adding the class restarts the CSS animation every tick.
      window.requestAnimationFrame(() => {
        this.pulseActive = true;
        if (pulseTimeoutHandle) window.clearTimeout(pulseTimeoutHandle);
        pulseTimeoutHandle = window.setTimeout(() => { this.pulseActive = false; }, 300);
      });
    },

    // Tick sound (Settings → Tick sound): a short beep on the last 3 seconds (3, 2, 1) of any
    // timed phase, so a countdown is audible without looking at the screen. Stopwatch's ascending
    // run phase has no "end" to count down to, so it's excluded.
    _maybeCountdownBeep() {
      const phase = this.sessionState.currentPhase;
      if (!phase || phase.type === 'stopwatch-run') return;
      const wholeSecond = Math.ceil(this.sessionState.remainingMs / 1000);
      if (wholeSecond === lastCountdownSecond) return;
      lastCountdownSecond = wholeSecond;
      if (wholeSecond >= 1 && wholeSecond <= 3) {
        audio.playTick(this.settings);
      }
    },

    // Encouragement mode: at 25/50/75% elapsed into the current Exercise phase, show a random
    // motivational message. Resets per phase (see _onPhaseChange) so it re-fires every round.
    _maybeEncourage() {
      if (!this.settings.encouragementEnabled) return;
      const phase = this.sessionState.currentPhase;
      if (!phase || phase.type !== 'exercise') return;
      const duration = phase.durationMs;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const fraction = this.sessionState.elapsedInPhaseMs / duration;
      [0.25, 0.5, 0.75].forEach((threshold) => {
        if (fraction >= threshold && !encouragementThresholdsShown.has(threshold)) {
          encouragementThresholdsShown.add(threshold);
          this._showEncouragement();
        }
      });
    },

    _showEncouragement() {
      this.encouragementMessage = pickEncouragementMessage(this.settings.encouragementName);
      if (encouragementTimeoutHandle) window.clearTimeout(encouragementTimeoutHandle);
      encouragementTimeoutHandle = window.setTimeout(() => { this.encouragementMessage = null; }, 3000);
    },

    togglePause() {
      this.sessionState = this.sessionState.status === SESSION_STATUS.RUNNING ? engine.pause() : engine.resume();
    },

    nextPhase() {
      this.sessionState = engine.nextPhase();
    },

    previousPhase() {
      this.sessionState = engine.previousPhase();
    },

    exitSession() {
      if (this.sessionState.status === SESSION_STATUS.RUNNING || this.sessionState.status === SESSION_STATUS.PAUSED) {
        this.sessionState = engine.stop();
      }
      this._stopTickLoop();
      wakelock.releaseWakeLock();
      this.view = 'home';
    },

    _onPhaseChange(state) {
      encouragementThresholdsShown = new Set();
      this.encouragementMessage = null;
      if (!state.currentPhase) return;
      audio.playCue(state.currentPhase.type, this.settings);
      haptics.vibrate(120, this.settings);
    },

    _onSessionEnd(state) {
      const entry = {
        id: crypto.randomUUID(),
        workoutName: state.mode === 'tabata' || state.mode === 'rounds' || state.mode === 'stopwatch'
          ? (this.templates.find((t) => t.mode === state.mode && t.isBuiltin)?.name || state.mode)
          : state.mode,
        mode: state.mode,
        completedAt: new Date().toISOString(),
        totalDurationMs: state.totalDurationMs,
        roundsCompleted: state.roundsCompleted,
        cyclesCompleted: state.cyclesCompleted,
        status: state.status,
      };
      const result = storage.addHistoryEntry(entry);
      if (result.ok) this.history = storage.getHistory();
      wakelock.releaseWakeLock();
      if (state.status === SESSION_STATUS.FINISHED && this.settings.funMode) {
        this._celebrate();
      }
    },

    // Confetti celebration on full completion only (not on an early stop), gated by Fun mode.
    // Degrades silently if the canvas-confetti CDN script failed to load (e.g. offline first
    // visit) — never blocks the completion screen from showing.
    _celebrate() {
      if (typeof window.confetti !== 'function') return;
      try {
        const burst = (particleRatio, opts) => window.confetti({
          particleCount: Math.floor(200 * particleRatio),
          origin: { y: 0.6 },
          ...opts,
        });
        burst(0.25, { spread: 26, startVelocity: 55 });
        burst(0.2, { spread: 60 });
        burst(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
        burst(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
        burst(0.1, { spread: 120, startVelocity: 45 });
      } catch (err) {
        console.warn('confetti: celebration failed', err);
      }
    },

    // --- presentation helpers exposed to the template ---
    phaseLabel,
    phaseStyle,
    formatDuration,
    formatElapsed,
    formatVolumePercent,
    formatHistoryEntry,
    ringDashoffset,
    icon,

    // --- editor (Plus tab) ---
    openEditor(template) {
      this.editingTemplate = template ? { ...template } : createEmptyTemplate();
      this.editingErrors = {};
      this.view = 'editor';
    },

    cancelEditor() {
      this.editingTemplate = createEmptyTemplate();
      this.view = 'home';
    },

    saveEditor() {
      const { valid, errors } = validateTemplate(this.editingTemplate);
      this.editingErrors = errors;
      if (!valid) return;
      if (!this.editingTemplate.id) {
        this.editingTemplate.id = crypto.randomUUID();
      }
      const result = storage.saveTemplate(this.editingTemplate);
      if (!result.ok) {
        this.editingErrors._storage = 'Could not save this workout — storage may be full or disabled.';
        return;
      }
      this.templates = storage.getTemplates();
      this.editingTemplate = createEmptyTemplate();
      this.view = 'home';
    },

    deleteTemplate(template) {
      if (!window.confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
      storage.deleteTemplate(template.id);
      this.templates = storage.getTemplates();
    },

    duplicateTemplateAction(template) {
      const copy = duplicateTemplate(template);
      copy.id = crypto.randomUUID();
      storage.saveTemplate(copy);
      this.templates = storage.getTemplates();
    },

    get customTemplates() {
      return this.templates.filter((t) => !t.isBuiltin);
    },

    // --- settings ---
    openSettings() {
      this.view = 'settings';
    },

    closeSettings() {
      this.view = 'home';
    },

    onSettingsChange() {
      storage.saveSettings(this.settings);
    },

    applyPhaseColorPreset(preset) {
      this.settings.phaseColors = {
        prepare: preset.prepare,
        exercise: preset.exercise,
        rest: preset.rest,
        cycleRest: preset.cycleRest,
      };
      this.onSettingsChange();
    },

    isActivePhaseColorPreset(preset) {
      const c = this.settings.phaseColors;
      return c.prepare === preset.prepare && c.exercise === preset.exercise && c.rest === preset.rest
        && c.cycleRest === preset.cycleRest;
    },

    // --- history ---
    openHistory() {
      this.history = storage.getHistory();
      this.view = 'history';
    },

    closeHistory() {
      this.view = 'home';
    },

    deleteHistoryEntry(id) {
      storage.deleteHistoryEntry(id);
      this.history = storage.getHistory();
    },

    clearHistory() {
      if (!window.confirm('Clear all workout history? This cannot be undone.')) return;
      storage.clearHistory();
      this.history = [];
    },
  };
}

window.appRoot = appRoot;
window.Alpine = Alpine;
Alpine.start();
