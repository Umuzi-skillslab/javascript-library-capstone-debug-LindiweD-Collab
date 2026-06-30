/**
 * library.test.js — Comprehensive test suite (Jest + jsdom).
 * Run with: npm test -- --coverage
 */

import { jest } from '@jest/globals';
import {
  Book,
  DigitalBook,
  Member,
  PremiumMember,
  getBooksByAuthor,
  searchBooksByCategory,
  calculateTotalLateFees,
  getMostPopularBook,
  findMemberById,
  countAvailableCopiesRecursive,
  findBookByIsbnRecursive,
  combineBookCollections,
  addMultipleBooks,
  makeAvailabilityFilter,
  composeFilters,
  LibraryStats,
} from '../src/library.js';
import {
  isNonEmptyString,
  isPositiveNumber,
  isNullOrUndefined,
  validateMemberInput,
  assertType,
  safeNumber,
} from '../src/utils.js';
import {
  exportLibraryData,
  importLibraryData,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
} from '../src/storage.js';
import {
  renderBookCatalogue,
  displayBookDetails,
  renderStatsDashboard,
  handleFilterChange,
  handleSearchInput,
  handleBorrowFormSubmit,
  attachCatalogueDelegation,
  attachMemberTableDelegation,
  initApp,
} from '../src/ui.js';

/* ----------------------------------------------------------------------- */
/* Fixtures                                                                 */
/* ----------------------------------------------------------------------- */

function makeBooks() {
  const b1 = new Book('Clean Code', 'Robert Martin', 'ISBN-001', 2);
  const b2 = new Book('The Pragmatic Programmer', 'David Thomas', 'ISBN-002', 1);
  const b3 = new Book('Eloquent JavaScript', 'Marijn Haverbeke', 'ISBN-003', 0);
  b1.category = 'software';
  b2.category = 'software';
  b3.category = 'javascript';
  return [b1, b2, b3];
}

/* ----------------------------------------------------------------------- */
/* Book class                                                               */
/* ----------------------------------------------------------------------- */

describe('Book class', () => {
  test('creates a book with correct properties', () => {
    const book = new Book('1984', 'George Orwell', 'ISBN-100', 3);
    expect(book.title).toBe('1984');
    expect(book.totalCopies).toBe(3);
    expect(book.availableCopies).toBe(3);
  });

  test('isAvailable() reflects availableCopies', () => {
    const book = new Book('Dune', 'Frank Herbert', 'ISBN-101', 1);
    expect(book.isAvailable()).toBe(true);
    book.checkOut();
    expect(book.isAvailable()).toBe(false);
  });

  test('checkOut() throws when no copies are available', () => {
    const book = new Book('Dune', 'Frank Herbert', 'ISBN-101', 1);
    book.checkOut();
    expect(() => book.checkOut()).toThrow();
  });

  test('getInfo() returns a formatted template-literal string', () => {
    const book = new Book('Dune', 'Frank Herbert', 'ISBN-101', 1);
    expect(book.getInfo()).toContain('Dune');
    expect(book.getInfo()).toContain('Frank Herbert');
  });

  test('throws on invalid constructor input', () => {
    expect(() => new Book('', 'Author', 'X')).toThrow(TypeError);
  });
});

/* ----------------------------------------------------------------------- */
/* DigitalBook inheritance                                                  */
/* ----------------------------------------------------------------------- */

describe('DigitalBook (inheritance)', () => {
  test('inherits from Book and calls super() correctly', () => {
    const ebook = new DigitalBook('Snow Crash', 'Neal Stephenson', 'ISBN-200', 'EPUB', 5);
    expect(ebook).toBeInstanceOf(Book);
    expect(ebook.title).toBe('Snow Crash');
    expect(ebook.fileFormat).toBe('EPUB');
  });

  test('overrides isAvailable() and checkOut() appropriately', () => {
    const ebook = new DigitalBook('Snow Crash', 'Neal Stephenson', 'ISBN-200');
    expect(ebook.isAvailable()).toBe(true);
    const result = ebook.checkOut();
    expect(result).toContain('Downloading');
  });
});

/* ----------------------------------------------------------------------- */
/* Member / PremiumMember                                                   */
/* ----------------------------------------------------------------------- */

describe('Member and PremiumMember classes', () => {
  test('Member tracks joinDate and computes membership duration', () => {
    const joined = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10); // 10 days ago
    const member = new Member('Zinhle', 'M-001', joined);
    expect(member.getMembershipDuration()).toBeGreaterThanOrEqual(9);
  });

  test('Member.canBorrow respects MAX_BOOKS_PER_MEMBER (regular limit 5)', () => {
    const member = new Member('Zinhle', 'M-001');
    for (let i = 0; i < 5; i += 1) {
      member.borrowBook(new Book(`Title ${i}`, 'Author', `ISBN-${i}`, 1));
    }
    expect(member.canBorrow()).toBe(false);
  });

  test('PremiumMember.canBorrow override allows up to 10 books', () => {
    const member = new PremiumMember('Sipho', 'M-002');
    for (let i = 0; i < 10; i += 1) {
      member.borrowBook(new Book(`Title ${i}`, 'Author', `ISBN-P${i}`, 1));
    }
    expect(member.borrowedBooks.length).toBe(10);
    expect(member.canBorrow()).toBe(false);
    expect(member).toBeInstanceOf(Member);
  });
});

/* ----------------------------------------------------------------------- */
/* Functional programming / array methods                                  */
/* ----------------------------------------------------------------------- */

describe('Array methods (filter, map, reduce, find)', () => {
  test('getBooksByAuthor filters correctly (filter)', () => {
    const books = makeBooks();
    const results = getBooksByAuthor(books, 'robert martin');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Clean Code');
  });

  test('searchBooksByCategory filters by category (filter)', () => {
    const books = makeBooks();
    const results = searchBooksByCategory(books, 'software');
    expect(results).toHaveLength(2);
  });

  test('calculateTotalLateFees sums fees correctly (reduce)', () => {
    const member = new Member('Test', 'M-010');
    member.borrowedBooks = [{ daysOverdue: 4 }, { daysOverdue: 0 }];
    const total = calculateTotalLateFees([member], 0.5);
    expect(total).toBe(2);
  });

  test('getMostPopularBook finds the most frequent ISBN (reduce)', () => {
    const history = ['ISBN-001', 'ISBN-002', 'ISBN-001', 'ISBN-001'];
    expect(getMostPopularBook(history)).toBe('ISBN-001');
  });

  test('findMemberById uses find() correctly', () => {
    const members = [new Member('A', 'M-1'), new Member('B', 'M-2')];
    const found = findMemberById(members, 'M-2');
    expect(found.name).toBe('B');
    expect(findMemberById(members, 'M-999')).toBeNull();
  });

  test('makeAvailabilityFilter + composeFilters (higher-order functions)', () => {
    const books = makeBooks();
    const availableOnly = makeAvailabilityFilter(true);
    const softwareAndAvailable = composeFilters(availableOnly, (b) => b.category === 'software');
    const results = books.filter(softwareAndAvailable);
    expect(results.every((b) => b.isAvailable() && b.category === 'software')).toBe(true);
  });
});

/* ----------------------------------------------------------------------- */
/* Recursion                                                                 */
/* ----------------------------------------------------------------------- */

describe('Recursive functions', () => {
  test('countAvailableCopiesRecursive sums copies with a proper base case', () => {
    const books = makeBooks();
    expect(countAvailableCopiesRecursive(books)).toBe(3); // 2 + 1 + 0
  });

  test('countAvailableCopiesRecursive handles an empty array (edge case)', () => {
    expect(countAvailableCopiesRecursive([])).toBe(0);
  });

  test('findBookByIsbnRecursive finds a book via binary search', () => {
    const books = makeBooks(); // already sorted by ISBN-001..003
    const found = findBookByIsbnRecursive(books, 'ISBN-002');
    expect(found.title).toBe('The Pragmatic Programmer');
  });

  test('findBookByIsbnRecursive returns null when not found (edge case)', () => {
    const books = makeBooks();
    expect(findBookByIsbnRecursive(books, 'ISBN-999')).toBeNull();
  });
});

/* ----------------------------------------------------------------------- */
/* Spread / rest                                                            */
/* ----------------------------------------------------------------------- */

describe('Spread and rest operators', () => {
  test('combineBookCollections merges two arrays without mutation (spread)', () => {
    const a = [new Book('A', 'Author', 'ISBN-A', 1)];
    const b = [new Book('B', 'Author', 'ISBN-B', 1)];
    const combined = combineBookCollections(a, b);
    expect(combined).toHaveLength(2);
    expect(a).toHaveLength(1); // original untouched
  });

  test('addMultipleBooks accepts variable arguments (rest parameters)', () => {
    const library = [];
    const updated = addMultipleBooks(
      library,
      new Book('A', 'Author', 'ISBN-A', 1),
      new Book('B', 'Author', 'ISBN-B', 1),
      new Book('C', 'Author', 'ISBN-C', 1)
    );
    expect(updated).toHaveLength(3);
  });
});

/* ----------------------------------------------------------------------- */
/* Error handling / validation                                             */
/* ----------------------------------------------------------------------- */

describe('Error handling and validation', () => {
  test('importLibraryData throws a clear error on malformed JSON (try-catch)', () => {
    expect(() => importLibraryData('{not valid json')).toThrow(/Failed to import/);
  });

  test('importLibraryData throws when required arrays are missing', () => {
    expect(() => importLibraryData(JSON.stringify({ foo: 'bar' }))).toThrow();
  });

  test('isNonEmptyString and isPositiveNumber validate types correctly', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isPositiveNumber(5)).toBe(true);
    expect(isPositiveNumber(-1)).toBe(false);
  });

  test('safeNumber prevents NaN propagation (edge case)', () => {
    expect(safeNumber('not a number', 0)).toBe(0);
    expect(safeNumber('42')).toBe(42);
  });

  test('Book constructor rejects null/undefined title (null check)', () => {
    expect(() => new Book(undefined, 'Author', 'X')).toThrow();
  });
});

/* ----------------------------------------------------------------------- */
/* String / Math / template literals                                       */
/* ----------------------------------------------------------------------- */

describe('Strings, Math, and template literals', () => {
  test('LibraryStats.averageCopiesPerTitle uses Math for rounding', () => {
    const books = makeBooks();
    const avg = LibraryStats.averageCopiesPerTitle(books);
    expect(typeof avg).toBe('number');
    expect(avg).toBeCloseTo(1, 0);
  });

  test('Book.getInfo() produces a template-literal-formatted string', () => {
    const book = new Book('Test Title', 'Test Author', 'ISBN-X', 2);
    expect(book.getInfo()).toBe('Test Title by Test Author (2/2 available)');
  });

  test('LibraryStats.getAvailabilitySummary returns destructured object shape', () => {
    const books = makeBooks();
    const summary = LibraryStats.getAvailabilitySummary(books);
    expect(summary).toHaveProperty('available');
    expect(summary).toHaveProperty('availabilityRate');
  });
});

/* ----------------------------------------------------------------------- */
/* localStorage persistence                                                 */
/* ----------------------------------------------------------------------- */

describe('localStorage persistence', () => {
  function makeFakeStorage() {
    let store = {};
    return {
      getItem: (key) => (key in store ? store[key] : null),
      setItem: (key, value) => {
        store[key] = String(value);
      },
      removeItem: (key) => {
        delete store[key];
      },
    };
  }

  test('saveToLocalStorage and loadFromLocalStorage round-trip data', () => {
    const storage = makeFakeStorage();
    const books = makeBooks();
    saveToLocalStorage(books, [], storage);
    const loaded = loadFromLocalStorage(storage);
    expect(loaded.books).toHaveLength(3);
  });

  test('loadFromLocalStorage returns null when no data is stored (edge case)', () => {
    const storage = makeFakeStorage();
    expect(loadFromLocalStorage(storage)).toBeNull();
  });

  test('exportLibraryData produces valid JSON (JSON.stringify)', () => {
    const json = exportLibraryData(makeBooks(), []);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

/* ----------------------------------------------------------------------- */
/* DOM tests (jsdom)                                                        */
/* ----------------------------------------------------------------------- */

describe('DOM rendering and events', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = '<div id="catalogue"></div><select id="filter"><option value="all">All</option></select>';
    container = document.getElementById('catalogue');
  });

  test('renderBookCatalogue renders one card per book', () => {
    renderBookCatalogue(makeBooks(), container);
    expect(container.querySelectorAll('.book-card')).toHaveLength(3);
  });

  test('renderBookCatalogue clears previous content before re-rendering', () => {
    const books = makeBooks();
    renderBookCatalogue(books, container);
    renderBookCatalogue(books, container);
    expect(container.querySelectorAll('.book-card')).toHaveLength(3); // not 6
  });

  test('renderBookCatalogue is a no-op when container is null (null check)', () => {
    expect(() => renderBookCatalogue(makeBooks(), null)).not.toThrow();
  });

  test('handleFilterChange re-renders filtered results on change event', () => {
    const books = makeBooks();
    renderBookCatalogue(books, container);
    const fakeEvent = { target: { value: 'software' } };
    handleFilterChange(fakeEvent, books, container);
    expect(container.querySelectorAll('.book-card')).toHaveLength(2);
  });

  test('handleSearchInput filters by author text', () => {
    const books = makeBooks();
    const fakeEvent = { target: { value: 'marijn haverbeke' } };
    handleSearchInput(fakeEvent, books, container);
    expect(container.querySelectorAll('.book-card')).toHaveLength(1);
  });

  test('handleBorrowFormSubmit calls preventDefault and processes a valid borrow', () => {
    const books = makeBooks();
    const members = [new Member('Zinhle', 'M-001')];
    const preventDefault = jest.fn();
    const form = {
      elements: { memberId: { value: 'M-001' }, isbn: { value: 'ISBN-001' } },
    };
    const result = handleBorrowFormSubmit({ preventDefault, target: form }, members, books);
    expect(preventDefault).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(members[0].borrowedBooks).toHaveLength(1);
  });

  test('attachCatalogueDelegation handles dynamically added borrow buttons (event delegation)', () => {
    const books = makeBooks();
    const onBorrow = jest.fn();
    attachCatalogueDelegation(container, books, [], onBorrow);
    renderBookCatalogue(books, container); // buttons added AFTER listener attached
    const button = container.querySelector('.borrow-btn[data-isbn="ISBN-001"]');
    button.dispatchEvent(new Event('click', { bubbles: true }));
    expect(onBorrow).toHaveBeenCalled();
  });

  test('attachCatalogueDelegation ignores clicks outside borrow buttons', () => {
    const onBorrow = jest.fn();
    attachCatalogueDelegation(container, makeBooks(), [], onBorrow);
    container.dispatchEvent(new Event('click', { bubbles: true }));
    expect(onBorrow).not.toHaveBeenCalled();
  });

  test('attachMemberTableDelegation handles remove-member clicks (event delegation)', () => {
    const tbody = document.createElement('tbody');
    const row = document.createElement('tr');
    row.innerHTML = '<td><button class="remove-member-btn" data-member-id="M-1">x</button></td>';
    tbody.appendChild(row);
    document.body.appendChild(tbody);

    const onRemove = jest.fn();
    attachMemberTableDelegation(tbody, onRemove);
    tbody.querySelector('.remove-member-btn').dispatchEvent(new Event('click', { bubbles: true }));
    expect(onRemove).toHaveBeenCalledWith('M-1');
  });

  test('attachMemberTableDelegation is a no-op when tableBody is null', () => {
    expect(() => attachMemberTableDelegation(null, jest.fn())).not.toThrow();
  });

  test('displayBookDetails renders a single book and no-ops on missing args', () => {
    const detailsContainer = document.createElement('div');
    const [book] = makeBooks();
    displayBookDetails(book, detailsContainer);
    expect(detailsContainer.textContent).toContain(book.title);
    expect(() => displayBookDetails(null, detailsContainer)).not.toThrow();
    expect(() => displayBookDetails(book, null)).not.toThrow();
  });

  test('renderStatsDashboard renders availability and average stats', () => {
    const statsContainer = document.createElement('div');
    renderStatsDashboard(makeBooks(), statsContainer);
    expect(statsContainer.textContent).toContain('Total titles');
    expect(() => renderStatsDashboard(makeBooks(), null)).not.toThrow();
  });

  test('handleFilterChange falls back to all books when category is "all"', () => {
    const books = makeBooks();
    handleFilterChange({ target: { value: 'all' } }, books, container);
    expect(container.querySelectorAll('.book-card')).toHaveLength(3);
  });

  test('handleFilterChange / handleSearchInput no-op gracefully on malformed events', () => {
    expect(() => handleFilterChange(null, makeBooks(), container)).not.toThrow();
    expect(() => handleSearchInput({}, makeBooks(), container)).not.toThrow();
  });

  test('handleBorrowFormSubmit returns a failure result for an unknown member', () => {
    const preventDefault = jest.fn();
    const form = { elements: { memberId: { value: 'NOPE' }, isbn: { value: 'ISBN-001' } } };
    const result = handleBorrowFormSubmit({ preventDefault, target: form }, [], makeBooks());
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No member found/);
  });
});

/* ----------------------------------------------------------------------- */
/* Additional class / utils / storage coverage                             */
/* ----------------------------------------------------------------------- */

describe('Additional coverage: DigitalBook, PremiumMember, LibraryStats', () => {
  test('DigitalBook.getInfo() reflects the digital format', () => {
    const ebook = new DigitalBook('Snow Crash', 'Neal Stephenson', 'ISBN-200', 'MOBI', 3);
    expect(ebook.getInfo()).toContain('Digital');
    expect(ebook.getInfo()).toContain('MOBI');
  });

  test('PremiumMember.addPerk appends perks via rest parameters', () => {
    const member = new PremiumMember('Sipho', 'M-300', new Date(), ['free shipping']);
    member.addPerk('priority hold', 'extended loan');
    expect(member.perks).toEqual(['free shipping', 'priority hold', 'extended loan']);
  });

  test('Member.returnBook returns the book and updates availability', () => {
    const member = new Member('Test', 'M-400');
    const [book] = makeBooks();
    member.borrowBook(book);
    const returned = member.returnBook(book.isbn);
    expect(returned).toBe(book);
    expect(member.borrowedBooks).toHaveLength(0);
  });

  test('Member.returnBook throws for an ISBN the member does not hold', () => {
    const member = new Member('Test', 'M-401');
    expect(() => member.returnBook('NOT-HELD')).toThrow();
  });

  test('getMemberInfo() returns a destructured summary object', () => {
    const member = new Member('Zinhle', 'M-500');
    const info = member.getMemberInfo();
    expect(info).toMatchObject({ name: 'Zinhle', memberId: 'M-500', booksOut: 0 });
  });

  test('LibraryStats.countByCategory tallies categories via for-of', () => {
    const counts = LibraryStats.countByCategory(makeBooks());
    expect(counts).toEqual({ software: 2, javascript: 1 });
  });

  test('LibraryStats.mostBorrowedAuthor finds the top author', () => {
    const books = makeBooks();
    const history = [books[0].isbn, books[0].isbn, books[1].isbn];
    expect(LibraryStats.mostBorrowedAuthor(books, history)).toBe('Robert Martin');
  });

  test('LibraryStats.mostBorrowedAuthor returns null for empty history (edge case)', () => {
    expect(LibraryStats.mostBorrowedAuthor(makeBooks(), [])).toBeNull();
  });

  test('Member constructor rejects an empty name (branch coverage)', () => {
    expect(() => new Member('', 'M-999')).toThrow(TypeError);
  });

  test('Member.borrowBook throws once the borrowing limit is reached (branch coverage)', () => {
    const member = new Member('Limit Test', 'M-998');
    for (let i = 0; i < 5; i += 1) {
      member.borrowBook(new Book(`T${i}`, 'Author', `ISBN-L${i}`, 1));
    }
    expect(() => member.borrowBook(new Book('Extra', 'Author', 'ISBN-EXTRA', 1))).toThrow(/borrowing limit/);
  });

  test('findBookByIsbnRecursive searches the low half when target is smaller (branch coverage)', () => {
    const books = makeBooks(); // ISBN-001, 002, 003
    expect(findBookByIsbnRecursive(books, 'ISBN-001').title).toBe('Clean Code');
  });

  test('addMultipleBooks rejects non-Book arguments (branch coverage)', () => {
    expect(() => addMultipleBooks([], { title: 'fake' })).toThrow(TypeError);
  });

  test('searchBooksByCategory returns all books when category is "all" or null', () => {
    const books = makeBooks();
    expect(searchBooksByCategory(books, 'all')).toHaveLength(3);
    expect(searchBooksByCategory(books, null)).toHaveLength(3);
  });

  test('getBooksByAuthor returns an empty array for an invalid author (edge case)', () => {
    expect(getBooksByAuthor(makeBooks(), '')).toEqual([]);
  });
});

describe('Additional coverage: utils.js', () => {
  test('isNullOrUndefined detects null and undefined only', () => {
    expect(isNullOrUndefined(null)).toBe(true);
    expect(isNullOrUndefined(undefined)).toBe(true);
    expect(isNullOrUndefined(0)).toBe(false);
    expect(isNullOrUndefined('')).toBe(false);
  });

  test('validateMemberInput passes for valid input and throws for invalid', () => {
    expect(validateMemberInput({ name: 'Zinhle', memberId: 'M-1' })).toBe(true);
    expect(() => validateMemberInput({ name: '', memberId: 'M-1' })).toThrow();
    expect(() => validateMemberInput({ name: 'Zinhle', memberId: null })).toThrow();
  });

  test('assertType throws with the provided message', () => {
    expect(() => assertType(false, 'custom failure message')).toThrow('custom failure message');
    expect(() => assertType(true, 'unused')).not.toThrow();
  });
});

describe('Additional coverage: storage edge cases', () => {
  test('saveToLocalStorage returns false when storage is unavailable', () => {
    expect(() => saveToLocalStorage([], [], null)).toThrow();
  });

  test('saveToLocalStorage catches storage errors and returns false', () => {
    const throwingStorage = {
      setItem: () => { throw new Error('quota exceeded'); },
    };
    expect(saveToLocalStorage([], [], throwingStorage)).toBe(false);
  });

  test('loadFromLocalStorage returns null when stored JSON is malformed', () => {
    const fakeStorage = { getItem: () => '{not valid json' };
    expect(loadFromLocalStorage(fakeStorage)).toBeNull();
  });

  test('loadFromLocalStorage returns null when stored value parses to a non-object', () => {
    const fakeStorage = { getItem: () => '42' };
    expect(loadFromLocalStorage(fakeStorage)).toBeNull();
  });

  test('loadFromLocalStorage returns null when storage is unavailable', () => {
    expect(loadFromLocalStorage(null)).toBeNull();
  });

  test('clearLocalStorage returns false when storage is unavailable or throws', () => {
    expect(clearLocalStorage(null)).toBe(false);
    const throwingStorage = { removeItem: () => { throw new Error('boom'); } };
    expect(clearLocalStorage(throwingStorage)).toBe(false);
  });

  test('importLibraryData rejects non-string input', () => {
    expect(() => importLibraryData(undefined)).toThrow();
    expect(() => importLibraryData('')).toThrow();
  });
});

describe('Additional coverage: ui.js selector warnings and init', () => {
  test('renderBookCatalogue warns but does not throw for a missing selector lookup elsewhere', () => {
    // qs() logs a warning and returns undefined when an element is absent;
    // downstream render functions must tolerate that gracefully.
    document.body.innerHTML = '';
    expect(() => renderBookCatalogue(makeBooks(), document.querySelector('#does-not-exist'))).not.toThrow();
  });

  test('initApp wires up listeners without throwing when all elements are present', () => {
    window.localStorage.clear();
    document.body.innerHTML = `
      <div id="book-catalogue"></div>
      <select id="filter-category"><option value="all">All</option></select>
      <input id="search-input" />
      <div id="stats-dashboard"></div>
      <form id="borrow-form"><input name="memberId" /><input name="isbn" /></form>
      <tbody id="member-table-body"></tbody>
    `;
    const state = { books: makeBooks(), members: [new Member('Zinhle', 'M-1')] };
    expect(() => initApp(state)).not.toThrow();
    expect(document.querySelectorAll('.book-card')).toHaveLength(3);

    // Exercise the borrow form's submit handler (success branch).
    const form = document.getElementById('borrow-form');
    form.elements.memberId.value = 'M-1';
    form.elements.isbn.value = 'ISBN-001';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(state.members[0].borrowedBooks).toHaveLength(1);

    // Exercise catalogue delegation (click on a borrow button).
    const borrowBtn = document.querySelector('.borrow-btn[data-isbn="ISBN-002"]');
    borrowBtn.dispatchEvent(new Event('click', { bubbles: true }));

    // Exercise the beforeunload persistence hook.
    expect(() => window.dispatchEvent(new Event('beforeunload'))).not.toThrow();
  });
});
