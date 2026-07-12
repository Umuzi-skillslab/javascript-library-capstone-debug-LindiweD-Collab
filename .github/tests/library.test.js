import {
  Book,
  DigitalBook,
  Member,
  PremiumMember,
  Library,
  LibraryStats,
  findBookRecursive,
  sumFeesRecursive,
  MAX_BOOKS_PER_MEMBER,
} from '../src/library.js';

import {
  isNonEmptyString,
  isPositiveNumber,
  formatCurrency,
  formatBookLabel,
  withLogging,
  debounce,
  composeValidators,
} from '../src/utils.js';

import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
} from '../src/storage.js';

// ── Book ─────────────────────────────────────────────────────────────────
describe('Book', () => {
  test('creates a book with correct properties', () => {
    const book = new Book('111', 'Dune', 'Frank Herbert', 'Fiction', 3);
    expect(book.isbn).toBe('111');
    expect(book.totalCopies).toBe(3);
    expect(book.availableCopies).toBe(3);
  });

  test('isAvailable() reflects availableCopies', () => {
    const book = new Book('112', 'Dune', 'Frank Herbert', 'Fiction', 1);
    expect(book.isAvailable()).toBe(true);
    book.checkOut();
    expect(book.isAvailable()).toBe(false);
  });

  test('checkOut() throws when no copies remain', () => {
    const book = new Book('113', 'Dune', 'Frank Herbert', 'Fiction', 1);
    book.checkOut();
    expect(() => book.checkOut()).toThrow();
  });

  test('getInfo() returns a formatted string via template literal', () => {
    const book = new Book('114', 'Dune', 'Frank Herbert', 'Fiction', 2);
    expect(book.getInfo()).toContain('Dune');
    expect(book.getInfo()).toContain('Frank Herbert');
  });

  test('throws TypeError for invalid constructor arguments (edge case)', () => {
    expect(() => new Book('', 'Title', 'Author', 'Fiction', 1)).toThrow(TypeError);
    expect(() => new Book('115', 'Title', 'Author', 'Fiction', -1)).toThrow(TypeError);
  });
});

// ── DigitalBook (inheritance) ────────────────────────────────────────────
describe('DigitalBook', () => {
  test('is an instance of both DigitalBook and Book (inheritance chain)', () => {
    const ebook = new DigitalBook('200', 'Neuromancer', 'William Gibson', 'Science', 'PDF');
    expect(ebook).toBeInstanceOf(DigitalBook);
    expect(ebook).toBeInstanceOf(Book);
  });

  test('is always available regardless of downloads', () => {
    const ebook = new DigitalBook('201', 'Neuromancer', 'William Gibson', 'Science');
    ebook.download();
    ebook.download();
    expect(ebook.isAvailable()).toBe(true);
  });

  test('download() increments downloadCount and returns a message', () => {
    const ebook = new DigitalBook('202', 'Neuromancer', 'William Gibson', 'Science', 'EPUB');
    const message = ebook.download();
    expect(ebook.downloadCount).toBe(1);
    expect(message).toContain('EPUB');
  });
});

// ── Member ───────────────────────────────────────────────────────────────
describe('Member', () => {
  test('creates a member with a joinDate and empty borrowed list', () => {
    const member = new Member('M1', 'Sipho', 'sipho@example.com');
    expect(member.joinDate).toBeInstanceOf(Date);
    expect(member.borrowedBooks).toEqual([]);
  });

  test('canBorrow() respects MAX_BOOKS_PER_MEMBER', () => {
    const member = new Member('M2', 'Naledi', 'naledi@example.com');
    for (let i = 0; i < MAX_BOOKS_PER_MEMBER; i += 1) {
      member.borrowedBooks.push({ isbn: `x${i}` });
    }
    expect(member.canBorrow()).toBe(false);
  });

  test('getMemberInfo() uses destructuring and returns a readable string', () => {
    const member = new Member('M3', 'Thabo', 'thabo@example.com');
    expect(member.getMemberInfo()).toContain('Thabo');
    expect(member.getMemberInfo()).toContain('M3');
  });
});

// ── PremiumMember (inheritance) ──────────────────────────────────────────
describe('PremiumMember', () => {
  test('allows borrowing more books than a regular member', () => {
    const premium = new PremiumMember('P1', 'Zanele', 'zanele@example.com');
    for (let i = 0; i < MAX_BOOKS_PER_MEMBER; i += 1) {
      premium.borrowedBooks.push({ isbn: `x${i}` });
    }
    // A regular member would be blocked here; premium should not be.
    expect(premium.canBorrow()).toBe(true);
  });

  test('is an instance of both PremiumMember and Member (inheritance chain)', () => {
    const premium = new PremiumMember('P2', 'Zanele', 'zanele@example.com');
    expect(premium).toBeInstanceOf(PremiumMember);
    expect(premium).toBeInstanceOf(Member);
  });
});

// ── Library ──────────────────────────────────────────────────────────────
describe('Library', () => {
  function buildSampleLibrary() {
    const library = new Library();
    library.addBook(new Book('A1', 'Dune', 'Frank Herbert', 'Fiction', 2));
    library.addBook(new Book('A2', 'Educated', 'Tara Westover', 'Non-Fiction', 1));
    library.addBook(new Book('A3', 'Sapiens', 'Yuval Noah Harari', 'History', 1));
    library.addMember(new Member('M1', 'Sipho', 'sipho@example.com'));
    return library;
  }

  test('addBook() rejects non-Book instances', () => {
    const library = new Library();
    expect(() => library.addBook({})).toThrow(TypeError);
  });

  test('addMultipleBooks() (rest parameter) adds several books at once', () => {
    const library = new Library();
    library.addMultipleBooks(
      new Book('B1', 'Title A', 'Author A', 'Fiction', 1),
      new Book('B2', 'Title B', 'Author B', 'Fiction', 1),
    );
    expect(library.books).toHaveLength(2);
  });

  test('findBookByIsbn() finds an existing book (find)', () => {
    const library = buildSampleLibrary();
    expect(library.findBookByIsbn('A2').title).toBe('Educated');
  });

  test('searchBooksByTitle() filters case-insensitively (filter)', () => {
    const library = buildSampleLibrary();
    expect(library.searchBooksByTitle('dune')).toHaveLength(1);
  });

  test('getBooksByAuthor() filters by exact author (filter)', () => {
    const library = buildSampleLibrary();
    expect(library.getBooksByAuthor('Frank Herbert')).toHaveLength(1);
  });

  test('getAvailableBooks() only returns books with copies left (filter)', () => {
    const library = buildSampleLibrary();
    library.findBookByIsbn('A2').checkOut();
    const available = library.getAvailableBooks();
    expect(available.find(b => b.isbn === 'A2')).toBeUndefined();
  });

  test('hasAnyAvailableBook() / allBooksAvailable() (some / every)', () => {
    const library = buildSampleLibrary();
    expect(library.hasAnyAvailableBook()).toBe(true);
    expect(library.allBooksAvailable()).toBe(true);
  });

  test('combineBookCollections() spreads without mutating original', () => {
    const library = buildSampleLibrary();
    const extra = [new Book('X1', 'Extra', 'Someone', 'Fiction', 1)];
    const combined = library.combineBookCollections(extra);
    expect(combined).toHaveLength(4);
    expect(library.books).toHaveLength(3); // unmutated
  });

  test('borrowBook() succeeds for an available book and eligible member', () => {
    const library = buildSampleLibrary();
    const result = library.borrowBook('M1', 'A1');
    expect(result.success).toBe(true);
    expect(library.findBookByIsbn('A1').availableCopies).toBe(1);
  });

  test('borrowBook() fails gracefully for a nonexistent member (edge case)', () => {
    const library = buildSampleLibrary();
    const result = library.borrowBook('does-not-exist', 'A1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No member found/);
  });

  test('borrowBook() fails gracefully for a nonexistent book (edge case)', () => {
    const library = buildSampleLibrary();
    const result = library.borrowBook('M1', 'does-not-exist');
    expect(result.success).toBe(false);
  });

  test('returnBook() restores availability', () => {
    const library = buildSampleLibrary();
    library.borrowBook('M1', 'A2');
    expect(library.findBookByIsbn('A2').availableCopies).toBe(0);
    const result = library.returnBook('M1', 'A2');
    expect(result.success).toBe(true);
    expect(library.findBookByIsbn('A2').availableCopies).toBe(1);
  });

  test('calculateTotalLateFees() sums fees across members (reduce)', () => {
    const library = buildSampleLibrary();
    library.members[0].lateFees = 20;
    library.addMember(new Member('M2', 'Naledi', 'naledi@example.com'));
    library.members[1].lateFees = 5;
    expect(library.calculateTotalLateFees()).toBe(25);
  });

  test('getMostPopularBook() returns the book with most copies checked out (reduce)', () => {
    const library = buildSampleLibrary();
    library.findBookByIsbn('A1').checkOut();
    library.findBookByIsbn('A1').checkOut();
    expect(library.getMostPopularBook().isbn).toBe('A1');
  });

  test('exportLibraryData() / importLibraryData() round-trip correctly', () => {
    const library = buildSampleLibrary();
    const json = library.exportLibraryData();

    const freshLibrary = new Library();
    const result = freshLibrary.importLibraryData(json);

    expect(result.success).toBe(true);
    expect(freshLibrary.books).toHaveLength(3);
  });

  test('importLibraryData() handles malformed JSON without throwing (edge case)', () => {
    const library = new Library();
    const result = library.importLibraryData('{ this is not valid json');
    expect(result.success).toBe(false);
  });
});

// ── LibraryStats ─────────────────────────────────────────────────────────
describe('LibraryStats', () => {
  test('getAverageCopiesPerBook() computes a correct average', () => {
    const books = [
      new Book('S1', 'A', 'Author', 'Fiction', 2),
      new Book('S2', 'B', 'Author', 'Fiction', 4),
    ];
    expect(LibraryStats.getAverageCopiesPerBook(books)).toBe(3);
  });

  test('getCategoryBreakdown() counts books per category (for-of)', () => {
    const books = [
      new Book('S3', 'A', 'Author', 'Fiction', 1),
      new Book('S4', 'B', 'Author', 'Fiction', 1),
      new Book('S5', 'C', 'Author', 'History', 1),
    ];
    expect(LibraryStats.getCategoryBreakdown(books)).toEqual({ Fiction: 2, History: 1 });
  });

  test('getLibrarySummary() returns a destructurable summary object', () => {
    const books = [new Book('S6', 'A', 'Author', 'Fiction', 1)];
    const members = [new Member('M9', 'Someone', 'someone@example.com')];
    const { totalBooks, totalMembers } = LibraryStats.getLibrarySummary(books, members);
    expect(totalBooks).toBe(1);
    expect(totalMembers).toBe(1);
  });
});

// ── Recursive functions ──────────────────────────────────────────────────
describe('Recursive functions', () => {
  test('findBookRecursive() finds a book by isbn', () => {
    const books = [
      new Book('R1', 'A', 'Author', 'Fiction', 1),
      new Book('R2', 'B', 'Author', 'Fiction', 1),
    ];
    expect(findBookRecursive(books, 'R2').title).toBe('B');
  });

  test('findBookRecursive() returns undefined for a missing isbn (base case, edge case)', () => {
    const books = [new Book('R3', 'A', 'Author', 'Fiction', 1)];
    expect(findBookRecursive(books, 'nope')).toBeUndefined();
  });

  test('sumFeesRecursive() sums an array of numbers', () => {
    expect(sumFeesRecursive([10, 5, 2.5])).toBe(17.5);
  });

  test('sumFeesRecursive() returns 0 for an empty array (base case, edge case)', () => {
    expect(sumFeesRecursive([])).toBe(0);
  });
});

// ── utils.js ─────────────────────────────────────────────────────────────
describe('utils', () => {
  test('isNonEmptyString() validates correctly', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString(42)).toBe(false);
  });

  test('isPositiveNumber() validates correctly', () => {
    expect(isPositiveNumber(5)).toBe(true);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
  });

  test('formatCurrency() formats numbers and handles bad input (edge case)', () => {
    expect(formatCurrency(19.5)).toBe('R19.50');
    expect(formatCurrency('not a number')).toBe('R0.00');
  });

  test('formatBookLabel() destructures its argument', () => {
    expect(formatBookLabel({ title: 'Dune', author: 'Frank Herbert' })).toBe('Dune — Frank Herbert');
  });

  test('withLogging() wraps a function without changing its result', () => {
    const add = (a, b) => a + b;
    const logged = withLogging(add);
    expect(logged(2, 3)).toBe(5);
  });

  test('composeValidators() requires all validators to pass', () => {
    const isString = v => typeof v === 'string';
    const isLong = v => v.length > 3;
    const validate = composeValidators(isString, isLong);
    expect(validate('hello')).toBe(true);
    expect(validate('hi')).toBe(false);
  });

  test('debounce() delays invocation until the timer elapses', () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const debounced = debounce(fn, 200);
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

// ── storage.js ───────────────────────────────────────────────────────────
describe('storage', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  test('saveToLocalStorage() / loadFromLocalStorage() round-trip', () => {
    const data = { hello: 'world' };
    expect(saveToLocalStorage(data)).toBe(true);
    expect(loadFromLocalStorage()).toEqual(data);
  });

  test('loadFromLocalStorage() returns null when nothing is saved', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  test('saveToLocalStorage() rejects null/undefined input (edge case)', () => {
    expect(saveToLocalStorage(undefined)).toBe(false);
  });
});
