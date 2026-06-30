/**
 * utils.js — Shared validation helpers used across the app.
 * Kept dependency-free and pure so they're trivial to unit test.
 */

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0;
}

export function isNullOrUndefined(value) {
  return value === null || value === undefined;
}

// Lightweight assertion helper — throws with a clear message instead of
// letting bad data silently propagate (a recurring issue in the starter
// code, e.g. NaN results from unvalidated number operations).
export function assertType(condition, message) {
  if (!condition) {
    throw new TypeError(message);
  }
}

export function validateMemberInput({ name, memberId }) {
  if (!isNonEmptyString(name)) {
    throw new TypeError('name must be a non-empty string');
  }
  if (isNullOrUndefined(memberId)) {
    throw new TypeError('memberId is required');
  }
  return true;
}

export function safeNumber(value, fallback = 0) {
  // Guards against NaN propagating through calculations (line 275 bug
  // in the original spec: unvalidated number operations produced NaN).
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}
