/**
 * src/utils.js
 *
 * Small, pure, dependency-free helper functions plus a couple of
 * higher-order functions. Nothing here touches the DOM or mutates
 * its inputs — that's what makes them easy to unit test in isolation.
 */

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0;
}

/**
 * Pure function: same input always produces the same output, no
 * side effects, no mutation of arguments.
 */
export function formatCurrency(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'R0.00';
  }
  return `R${amount.toFixed(2)}`;
}

/**
 * Pure function: builds a display string via template literal from a
 * destructured parameter object.
 */
export function formatBookLabel({ title, author }) {
  return `${title} — ${author}`;
}

/**
 * Higher-order function #1: wraps another function to log its calls,
 * returning a new function without modifying the original.
 */
export function withLogging(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('withLogging requires a function argument');
  }
  return function loggedFn(...args) {
    console.log(`[withLogging] Calling ${fn.name || 'anonymous'} with`, args);
    return fn(...args);
  };
}

/**
 * Higher-order function #2: classic debounce — delays invoking fn
 * until `delay` ms have passed since the last call.
 */
export function debounce(fn, delay = 300) {
  if (typeof fn !== 'function') {
    throw new TypeError('debounce requires a function argument');
  }
  let timerId;
  return function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Higher-order function #3: combines several validator functions
 * (rest parameter) into one that requires all of them to pass.
 */
export function composeValidators(...validators) {
  return function combined(value) {
    return validators.every(validate => validate(value));
  };
}
