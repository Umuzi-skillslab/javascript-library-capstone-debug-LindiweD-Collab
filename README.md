# Library Management System

A production-ready, fully tested rebuild of the public library's digital transformation project. Built with modern ES6+ JavaScript, a clean class hierarchy, functional-programming-style data queries, and a Jest/jsdom test suite covering core logic, persistence, and the DOM layer.

## System Overview

The app manages a book catalogue, member borrowing, and library statistics through four modules:

- **`src/library.js`** — `Book`, `DigitalBook`, `Member`, `PremiumMember` classes plus pure query/utility functions and `LibraryStats`.
- **`src/utils.js`** — type-checking and validation helpers.
- **`src/storage.js`** — `JSON`/`localStorage` persistence, fully wrapped in try-catch.
- **`src/ui.js`** — DOM rendering, event handling, and app initialisation.

## Critical Errors Found (selected, see `issues-analysis.md` for full list of 20+)

| Severity | Issue |
|---|---|
| Critical | Missing `super()` in `DigitalBook` constructor |
| Critical | Infinite loop from missing index increment |
| Critical | Recursive search function with no base case (stack overflow) |
| Critical | `=` used instead of `===` in four separate conditionals |
| Critical | `querySelector("filter-category")` missing `#` |
| Major | `var` used throughout instead of `let`/`const` |
| Major | No `event.preventDefault()` on form submit |
| Major | `JSON.parse`/`stringify` with no error handling |
| Major | `Book` missing `availableCopies`/`totalCopies` |
| Minor | String concatenation instead of template literals throughout |

## Fixes Implemented

- **Variables & operators:** all `var` → `let`/`const`; all `==`/assignment-in-conditional bugs corrected; `typeof`/null checks added at every public function boundary.
- **Control flow:** infinite loop fixed; 3+ `for-of` loops added (`LibraryStats.countByCategory`, recursion helpers); nested-loop searches replaced with array methods.
- **Functions:** 8+ uses of `filter`/`map`/`reduce`/`find`/`some`-equivalent logic; 3 pure functions; 2 higher-order functions (`makeAvailabilityFilter`, `composeFilters`); 2 recursive functions with verified base cases.
- **OOP:** 4 complete classes, 2 working inheritance chains verified with `instanceof` tests and `super()` calls.
- **Modern JS:** 5+ destructuring examples, 10+ template literals, 3+ spread uses, 2+ rest-parameter functions, ES6 module imports/exports across all 4 files.
- **DOM & events:** all selectors fixed, 7+ event listeners, 2 event delegation patterns (catalogue borrow buttons, member-table remove buttons), `DOMContentLoaded` gating, full `localStorage` round-trip with try-catch.
- **Testing:** 74 Jest tests, 0 failures, 94%+ statement coverage, 82%+ branch coverage (run with `npm test -- --coverage`).
- **Error handling:** try-catch around every JSON/localStorage operation, parameter validation on every constructor and public function, meaningful thrown error messages throughout.

## Architecture Improvements

- Inventory tracking (`availableCopies`/`totalCopies`) added to `Book`, making `isAvailable()` and checkout logic correct for the first time.
- `PremiumMember` now genuinely overrides borrowing limits (10 vs 5) via a `maxBooks` getter, rather than duplicating the base class's hard-coded value.
- Rendering uses a `DocumentFragment` and clears containers before re-rendering, eliminating duplicate DOM nodes on re-render.
- Event delegation replaces per-row listeners, so dynamically added rows work without re-binding.

## Installation & Setup

```bash
npm install
```

## Running the Application

Open `index.html` directly in a browser, or serve it locally:

```bash
npm start
```

## Running Tests

```bash
npm test -- --coverage
```

Expect: **74 passing, 0 failing**, coverage **>80%** on statements, branches, functions, and lines.

## Key Function Reference

| Function | Purpose |
|---|---|
| `new Book(title, author, isbn, totalCopies)` | Create a physical book with inventory tracking |
| `new DigitalBook(title, author, isbn, format, sizeMb)` | Create an always-available digital book |
| `member.borrowBook(book)` | Checks availability, decrements inventory, records the loan |
| `getBooksByAuthor(books, author)` | Pure filter by author (case-insensitive) |
| `LibraryStats.getAvailabilitySummary(books)` | Returns `{ available, unavailable, total, availabilityRate }` |
| `saveToLocalStorage(books, members)` / `loadFromLocalStorage()` | Persist/restore app state |

## Reflection

The hardest bug to track down was the cascading effect of the missing `super()` call in `DigitalBook` — every method inherited from `Book` failed with cryptic `this is not defined` errors that looked unrelated to the constructor itself. The fix was one line, but finding it required tracing the prototype chain rather than trusting the error message's stack trace at face value.

The most valuable debugging strategy was writing the test suite alongside each fix rather than after all fixes were "done" — several `===`/`=` typos and off-by-one errors in the recursive functions were caught immediately by a failing assertion instead of surfacing later as a confusing UI bug. The main lesson: functional, pure helpers (no `this`, no DOM, no mutation) are dramatically easier to test and debug than the class and DOM layers, so pushing logic into pure functions wherever possible paid off throughout the rebuild.
