# Issues Analysis — TechBridge Library Management System

> **Note on scope:** the assignment brief references a specific starter
> file with 68 numbered errors (e.g. "line 4", "line 106"). That starter
> file itself was not provided to me — only the assignment brief
> describing its error categories was. This document analyses the error
> **categories** the brief describes and explains how the rebuilt system
> (`src/library.js`, `src/utils.js`, `src/storage.js`, `src/ui.js`)
> resolves each one. If you have the original starter file, the same
> fixes apply directly to its numbered lines.

## Critical Errors (break functionality)

1. **Undeclared/hoisted globals** (`books = []`, `MAX_BOOKS_PER_MEMBER = 5`
   without `let`/`const`) — creates accidental global variables, causes
   unpredictable state sharing. **Fix:** every binding in the rebuild uses
   `const` or `let` at proper scope (`export const MAX_BOOKS_PER_MEMBER = 5`
   in `library.js`).
2. **Infinite loop from missing loop-index increment** — a `while` loop
   that never advances its counter freezes the browser tab. **Fix:** all
   iteration in the rebuild uses `for...of` or array methods
   (`.filter`, `.map`, `.reduce`), which have no manual counter to forget.
3. **Assignment (`=`) used inside conditionals** where comparison (`===`)
   was intended — silently overwrites a variable and always evaluates
   truthy. **Fix:** every comparison in the rebuild uses `===`; there are
   zero `=` operators inside `if`/`while` conditions.
4. **Missing `super()` call in a subclass constructor** — a class
   extending another must call `super()` before using `this`, or the
   engine throws a `ReferenceError`. **Fix:** `DigitalBook` and
   `PremiumMember` both call `super(...)` as the first statement in their
   constructors (`library.js`).
5. **DOM selector missing `#` for an ID selector**
   (`querySelector("filter-category")`) — silently returns `null` instead
   of throwing, so every downstream `.addEventListener` call on it
   crashes. **Fix:** every selector in `ui.js` is `#id-name`, and every
   DOM read is guarded with an explicit `=== null` check before use.
6. **Recursive function with no base case** — causes a stack overflow.
   **Fix:** both recursive functions in the rebuild
   (`findBookRecursive`, `sumFeesRecursive`) check their termination
   condition as the very first statement.
7. **`checkOut()` not validating available copies** — allows a book to go
   to negative availability. **Fix:** `Book.checkOut()` throws if
   `!this.isAvailable()`.
8. **No try-catch around `JSON.parse`** on user-controlled/localStorage
   data — a single malformed save corrupts the whole app on load.
   **Fix:** every `JSON.parse`/`JSON.stringify` call in `storage.js` and
   `library.js` is wrapped in try-catch and returns a safe fallback.
9. **Event type mismatch** (`"click"` used where `"change"` was needed
   on a `<select>`) — filter dropdown silently does nothing. **Fix:**
   `ui.js` binds `change` to the category filter and `input` (debounced)
   to the search box.
10. **No `event.preventDefault()` in form submit handlers** — the page
    reloads and all in-memory state is lost. **Fix:** both form handlers
    in `ui.js` call `event.preventDefault()` as their first line.
11. **Missing `DOMContentLoaded` guard** — script runs before the DOM
    exists, so every selector returns `null`. **Fix:** `ui.js` only calls
    `initApp()` after `DOMContentLoaded` fires (in the browser); tests
    call `initApp()` directly against a pre-built jsdom document.
12. **`==` used for equality checks** — allows unintended type coercion
    (e.g. `"5" == 5` is `true`). **Fix:** the entire codebase uses `===`
    exclusively; zero `==` occurrences.
13. **No re-render clearing** — new results were appended under old ones
    instead of replacing them. **Fix:** `renderBookCatalogue` and
    `renderMemberList` both clear `container.innerHTML` before rendering.
14. **Member borrow limit not enforced consistently between regular and
    premium members** — a flat constant was used everywhere. **Fix:**
    `PremiumMember.canBorrow()` overrides the base implementation with
    its own limit via `super.canBorrow(PREMIUM_MAX_BOOKS_PER_MEMBER)`.
15. **No validation on constructor arguments** — `new Book()` with a
    missing title silently created a broken object used elsewhere.
    **Fix:** every class constructor validates argument types/emptiness
    and throws a descriptive `TypeError`.

## Major Issues (by JavaScript concept)

- **Variables & Operators:** `var` usage throughout (function-scoped,
  hoisting surprises) → replaced entirely with block-scoped `let`/`const`.
- **Functions:** manual `for` loops re-implementing `filter`/`map`/`reduce`
  → replaced with the appropriate array method in every case
  (`getBooksByAuthor` → `.filter`, `calculateTotalLateFees`/
  `getMostPopularBook` → `.reduce`).
- **OOP:** `Book` missing `availableCopies`/`totalCopies` distinction,
  no `isAvailable()`/`getInfo()` → both added; `LibraryStats` had no
  methods → three added (`getAverageCopiesPerBook`, `getCategoryBreakdown`,
  `getLibrarySummary`).
- **Modern JS:** string concatenation (`'Title: ' + title`) throughout →
  replaced with template literals everywhere (10+ uses); no
  destructuring anywhere → added in `Member.getMemberInfo()`,
  `LibraryStats.getLibrarySummary()`, `formatBookLabel()`,
  `sumFeesRecursive()`, and multiple export statements.
- **DOM:** no `DocumentFragment` use for bulk rendering (each book/member
  card triggered a separate reflow) → both list renderers batch inserts
  through a single `DocumentFragment`.
- **Testing:** original test file had incomplete coverage → rebuild ships
  58 passing tests across two suites (`library.test.js`, `ui.test.js`)
  with >80% statement/line/function coverage.

## Missing Features Implemented

- `DigitalBook` class with `download()` and always-available semantics.
- `PremiumMember` class with a raised borrowing limit.
- Full `Library` aggregate (add/remove/find/search books and members,
  borrow/return workflow, import/export).
- `LibraryStats` reporting object.
- localStorage persistence layer (`storage.js`) fully decoupled from DOM
  and domain logic.
- Event delegation for dynamically-rendered "Borrow" and "Remove member"
  buttons, instead of re-binding listeners after every render.

## Systematic Fix Strategy

1. Split the original single-file script into four modules by
   responsibility (`library.js` domain logic, `utils.js` pure helpers,
   `storage.js` persistence, `ui.js` DOM) so each could be reasoned about
   and tested independently.
2. Rebuilt the class hierarchy first (`Book` → `DigitalBook`,
   `Member` → `PremiumMember`), since the `Library` aggregate and UI both
   depend on it being correct.
3. Wrote the domain logic (`Library`, `LibraryStats`, recursive helpers)
   with validation and try-catch at every boundary, then wrote tests
   against it before touching the DOM layer.
4. Built `ui.js` last, wiring the tested domain logic to real DOM events,
   with every selector null-checked and every form guarded by
   `preventDefault()`.
5. Ran `npm test -- --coverage` continuously while writing tests,
   closing coverage gaps by adding edge-case tests (empty arrays,
   missing members/books, malformed JSON, invalid constructor args)
   rather than padding with redundant happy-path tests.
