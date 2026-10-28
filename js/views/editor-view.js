// Validation and factory helpers for the custom workout editor (data-model.md: WorkoutTemplate).

export const TEMPLATE_COLORS = ['#facc15', '#a3e635', '#38bdf8', '#f97316', '#f43f5e', '#a78bfa'];

export function createEmptyTemplate() {
  return {
    id: null,
    name: '',
    color: TEMPLATE_COLORS[0],
    mode: 'tabata',
    prepareSec: 5,
    exerciseSec: 20,
    restSec: 10,
    rounds: 8,
    cycles: 1,
    restBetweenCyclesSec: 30,
    cooldownSec: 5,
    isBuiltin: false,
  };
}

export function duplicateTemplate(template) {
  return {
    ...template,
    id: null,
    name: `Copy of ${template.name}`.slice(0, 40),
    isBuiltin: false,
  };
}

/**
 * Validate a draft WorkoutTemplate per data-model.md's constraints:
 * - name non-empty, trimmed, max 40 chars
 * - exerciseSec/rounds/cycles >= 1 (coerced, not silently accepted as 0)
 * - all numeric fields are non-negative integers
 */
export function validateTemplate(template) {
  const errors = {};

  const name = (template.name || '').trim();
  if (!name) errors.name = 'Name is required.';
  else if (name.length > 40) errors.name = 'Name must be 40 characters or fewer.';

  const numericFields = [
    ['prepareSec', 0],
    ['exerciseSec', 1],
    ['restSec', 0],
    ['rounds', 1],
    ['cycles', 1],
    ['restBetweenCyclesSec', 0],
    ['cooldownSec', 0],
  ];

  numericFields.forEach(([field, min]) => {
    const value = Number(template[field]);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      errors[field] = 'Must be a non-negative whole number.';
    } else if (value < min) {
      errors[field] = `Must be at least ${min}.`;
    }
  });

  return { valid: Object.keys(errors).length === 0, errors };
}
