// Persistence layer. Contract: specs/001-interval-workout-timer/contracts/storage-schema.md
// and contracts/url-params.md. Every read tolerates a missing/malformed key by falling back to a
// default; every write catches storage errors (quota/disabled) and reports success/failure
// instead of throwing, so a session can keep running even if persistence is unavailable.

const KEYS = {
  TEMPLATES: 'timerweb.templates.v1',
  HISTORY: 'timerweb.history.v1',
  SETTINGS: 'timerweb.settings.v1',
};

// App accent-color presets (Settings → Theme). Purely cosmetic (CSS custom property), never
// affects phase colors (Prepare/Exercise/Rest keep their fixed meaning per FR-005).
export const THEME_PRESETS = [
  { name: 'Lime', color: '#a3e635' },
  { name: 'Marseille', color: '#00a3e0' },
  { name: 'Sunset', color: '#fb923c' },
  { name: 'Berry', color: '#f43f5e' },
  { name: 'Grape', color: '#a78bfa' },
];

const DEFAULT_SETTINGS = Object.freeze({
  soundEnabled: true,
  soundPreset: 'classic',
  volume: 0.8,
  tickSoundEnabled: false,
  vibrationEnabled: false,
  funMode: false,
  themeColor: THEME_PRESETS[0].color,
});

export const BUILTIN_TEMPLATES = [
  {
    id: 'builtin-tabata',
    name: 'Tabata',
    color: '#facc15',
    mode: 'tabata',
    prepareSec: 5,
    exerciseSec: 20,
    restSec: 10,
    rounds: 8,
    cycles: 1,
    restBetweenCyclesSec: 60,
    cooldownSec: 0,
    isBuiltin: true,
  },
  {
    id: 'builtin-rounds',
    name: 'Rounds',
    color: '#38bdf8',
    mode: 'rounds',
    prepareSec: 5,
    exerciseSec: 45,
    restSec: 15,
    rounds: 9,
    cycles: 1,
    restBetweenCyclesSec: 0,
    cooldownSec: 0,
    isBuiltin: true,
  },
  {
    id: 'builtin-stopwatch',
    name: 'Stopwatch',
    color: '#facc15',
    mode: 'stopwatch',
    prepareSec: 5,
    exerciseSec: 0,
    restSec: 10,
    rounds: 1,
    cycles: 1,
    restBetweenCyclesSec: 0,
    cooldownSec: 0,
    isBuiltin: true,
  },
];

function nowIso() {
  return new Date().toISOString();
}

function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (err) {
    console.warn('storage: malformed JSON, falling back to default', err);
    return fallback;
  }
}

function safeRead(key, fallback) {
  try {
    return safeParse(window.localStorage.getItem(key), fallback);
  } catch (err) {
    console.warn(`storage: read failed for ${key}`, err);
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (err) {
    console.warn(`storage: write failed for ${key}`, err);
    return { ok: false, error: err };
  }
}

export function getTemplates() {
  const stored = safeRead(KEYS.TEMPLATES, null);
  if (!Array.isArray(stored) || stored.length === 0) {
    const seeded = BUILTIN_TEMPLATES.map((t) => ({ ...t, createdAt: nowIso(), updatedAt: nowIso() }));
    safeWrite(KEYS.TEMPLATES, seeded);
    return seeded;
  }
  return stored;
}

export function saveTemplate(template) {
  const templates = getTemplates();
  const index = templates.findIndex((t) => t.id === template.id);
  const stamped = { ...template, updatedAt: nowIso(), createdAt: template.createdAt || nowIso() };
  if (index >= 0) {
    templates[index] = stamped;
  } else {
    templates.push(stamped);
  }
  const result = safeWrite(KEYS.TEMPLATES, templates);
  return { ...result, template: stamped };
}

export function deleteTemplate(id) {
  const templates = getTemplates().filter((t) => t.id !== id);
  return safeWrite(KEYS.TEMPLATES, templates);
}

export function getSettings() {
  const stored = safeRead(KEYS.SETTINGS, null);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(settings) {
  return safeWrite(KEYS.SETTINGS, { ...DEFAULT_SETTINGS, ...settings });
}

export function getHistory() {
  const stored = safeRead(KEYS.HISTORY, []);
  return Array.isArray(stored) ? stored : [];
}

export function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift(entry);
  return safeWrite(KEYS.HISTORY, history);
}

export function deleteHistoryEntry(id) {
  const history = getHistory().filter((h) => h.id !== id);
  return safeWrite(KEYS.HISTORY, history);
}

export function clearHistory() {
  return safeWrite(KEYS.HISTORY, []);
}

// --- URL query parameter sync (contracts/url-params.md) ---

const URL_NUMERIC_FIELDS = {
  prepare: 'prepareSec',
  exercise: 'exerciseSec',
  rest: 'restSec',
  rounds: 'rounds',
  cycles: 'cycles',
  restBetweenCycles: 'restBetweenCyclesSec',
  cooldown: 'cooldownSec',
};

export function readSessionConfigFromURL() {
  const params = new URLSearchParams(window.location.search);
  const config = {};
  const mode = params.get('mode');
  if (mode && ['tabata', 'rounds', 'stopwatch', 'plus'].includes(mode)) {
    config.mode = mode;
  }
  const template = params.get('template');
  if (template) config.template = template;

  Object.entries(URL_NUMERIC_FIELDS).forEach(([param, field]) => {
    const raw = params.get(param);
    if (raw === null) return;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) {
      config[field] = value;
    }
    // Malformed/negative values are ignored individually, falling back to the template default.
  });

  return config;
}

export function writeSessionConfigToURL(config) {
  const params = new URLSearchParams();
  if (config.mode) params.set('mode', config.mode);
  if (config.template) params.set('template', config.template);
  Object.entries(URL_NUMERIC_FIELDS).forEach(([param, field]) => {
    if (config[field] !== undefined && config[field] !== null) {
      params.set(param, String(config[field]));
    }
  });
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState(null, '', newUrl);
}
