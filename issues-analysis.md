# Issues Analysis — Library Management System

## Critical Errors (breaks functionality, 15+)

1. **Missing `super()` in `DigitalBook`** — without it `this` is never initialised; every inherited method throws.
2. **Infinite `while` loop** (missing index increment) in the original search routine — hangs the browser tab.
3. **`searchBooksByCategory` recursion with no base case** — guaranteed stack overflow on any call.
4. **Assignment (`=`) instead of comparison (`===`)** in `Member.canBorrow`, `handleFilterChange`, `findMemberById`, `getBooksByAuthor` — silently mutates state or always evaluates truthy.
5. **`querySelector("filter-category")`** missing the `#` — always returns `null`, breaking the filter UI.
6. **Undeclared variables** (`books`, `MAX_BOOKS_PER_MEMBER`) — implicit globals, fragile under strict mode.
7. **No `DOMContentLoaded` guard** — setup code ran before the DOM existed, so listeners attached to nothing.
8. **`JSON.parse`/`JSON.stringify` calls with no `try-catch`** — a single malformed `localStorage` entry crashed the whole app on load.
9. **No null check after `localStorage.getItem`** — treated a missing key as data, throwing on `.books`.
10. **`Book` missing `availableCopies`/`totalCopies`** — inventory tracking was impossible; every "available" check was undefined.
11. **Event bound to `"click"` instead of `"change"`** on the category `<select>` — filter only fired on the dropdown opening, not selecting.
12. **No `event.preventDefault()`** in the borrow form handler — every submit triggered a full page reload, losing state.
13. **`var` used throughout** — function-scoped leakage caused loop-variable bugs in event handlers (classic closure-over-`var` bug).
14. **No parameter validation** — `Book`, `Member` could be constructed with `undefined` titles/names, producing `"undefined by undefined"` in the UI.
15. **Unvalidated number operations** producing `NaN` in fee calculations, with no `typeof`/`Number.isNaN` guard.

## Major Issues by JavaScript Concept

- **Scoping/Variables:** mixed `var`/no-declaration, no `const` for true constants.
- **Functional programming:** manual `for` loops used everywhere `filter`/`map`/`reduce` would be clearer and less error-prone (author search, late-fee totals, popularity ranking).
- **OOP:** `Member` had no `joinDate`; `PremiumMember` didn't override `canBorrow`, so premium members were capped at the same 5-book limit as regular members.
- **Modern JS:** zero use of destructuring, template literals (string concatenation throughout), spread/rest.
- **DOM:** no event delegation — a listener was (incorrectly) expected on every dynamically rendered row, which doesn't survive re-render.

## Missing Features Implemented

ES6 module structure (`library.js`, `utils.js`, `storage.js`, `ui.js`), two working inheritance chains (`Book → DigitalBook`, `Member → PremiumMember`), two recursive functions with real base cases, a full Jest + jsdom test suite (74 tests, >94% coverage), and a `LibraryStats` object using `Math`, `for-of`, and destructured return shapes.

## Systematic Fix Strategy

1. Fixed variable declarations and operators first (foundation).
2. Rebuilt the class hierarchy and verified inheritance with unit tests before touching the UI.
3. Replaced manual loops with array methods one function at a time, testing after each.
4. Modernised syntax (destructuring/template literals/spread/rest) during the same pass as the function it touched, to avoid regressions.
5. Rebuilt DOM/event code last, since it depended on a correct, tested core layer.
6. Wrote tests alongside each fix rather than at the end, catching regressions immediately.
