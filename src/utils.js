export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value) && value >= 0;
}

export function formatCurrency(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'R0.00';
  }
  return `R${amount.toFixed(2)}`;
}

export function formatBookLabel({ title, author }) {
  return `${title} — ${author}`;
}

export function withLogging(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('withLogging requires a function argument');
  }
  return function loggedFn(...args) {
    console.log(`[withLogging] Calling ${fn.name || 'anonymous'} with`, args);
    return fn(...args);
  };
}

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

export function composeValidators(...validators) {
  return function combined(value) {
    return validators.every(validate => validate(value));
  };
}
