/**
 * library.js — Core domain logic for the Library Management System.
 *
 * Contains the class hierarchy (Book, DigitalBook, Member, PremiumMember),
 * the LibraryStats aggregation object, and the functional-programming
 * powered query/utility functions used across the app.
 *
 * All exports use ES6 module syntax.
 */

import { isNonEmptyString, assertType } from './utils.js';

export const MAX_BOOKS_PER_MEMBER = 5;
export const MAX_BOOKS_PER_PREMIUM_MEMBER = 10;

/* ----------------------------------------------------------------------- */
/* Book                                                                     */
/* ----------------------------------------------------------------------- */

export class Book {
  constructor(title, author, isbn, totalCopies = 1) {
    if (!isNonEmptyString(title) || !isNonEmptyString(author)) {
      throw new TypeError('Book requires a non-empty title and author');
    }
    if (typeof totalCopies !== 'number' || Number.isNaN(totalCopies) || totalCopies < 0) {
      throw new RangeError('totalCopies must be a non-negative number');
    }

    this.title = title;
    this.author = author;
    this.isbn = isbn;
    // totalCopies / availableCopies were missing in the starter code —
    // both are required to track inventory correctly.
    this.totalCopies = totalCopies;
    this.availableCopies = totalCopies;
  }

  // Pure check — no side effects, used throughout the UI layer.
  isAvailable() {
    return this.availableCopies > 0;
  }

  getInfo() {
    // Template literal replaces old string concatenation.
    return `${this.title} by ${this.author} (${this.availableCopies}/${this.totalCopies} available)`;
  }

  checkOut() {
    // Guard against checking out a book with zero copies left.
    if (!this.isAvailable()) {
      throw new Error(`"${this.title}" has no available copies to check out`);
    }
    this.availableCopies -= 1;
    return this;
  }

  returnCopy() {
    if (this.availableCopies < this.totalCopies) {
      this.availableCopies += 1;
    }
    return this;
  }
}

/* ----------------------------------------------------------------------- */
/* DigitalBook (inherits Book)                                             */
/* ----------------------------------------------------------------------- */

export class DigitalBook extends Book {
  constructor(title, author, isbn, fileFormat = 'EPUB', fileSizeMb = 0) {
    // The missing super() call was a critical bug — without it `this`
    // is never initialised and every inherited property/method breaks.
    // Digital books are effectively unlimited copies.
    super(title, author, isbn, Infinity);
    this.fileFormat = fileFormat;
    this.fileSizeMb = fileSizeMb;
  }

  // Digital copies are never exhausted.
  isAvailable() {
    return true;
  }

  // Override checkOut — digital books are "downloaded", not checked out.
  checkOut() {
    return this.download();
  }

  download() {
    return `Downloading "${this.title}" (${this.fileFormat}, ${this.fileSizeMb}MB)...`;
  }

  getInfo() {
    return `${this.title} by ${this.author} — Digital (${this.fileFormat})`;
  }
}

/* ----------------------------------------------------------------------- */
/* Member                                                                   */
/* ----------------------------------------------------------------------- */

export class Member {
  constructor(name, memberId, joinDate = new Date()) {
    if (!isNonEmptyString(name)) {
      throw new TypeError('Member requires a non-empty name');
    }
    this.name = name;
    this.memberId = memberId;
    // joinDate was missing in the starter code — required for
    // getMembershipDuration() and reporting.
    this.joinDate = joinDate instanceof Date ? joinDate : new Date(joinDate);
    this.borrowedBooks = [];
  }

  get maxBooks() {
    return MAX_BOOKS_PER_MEMBER;
  }

  canBorrow() {
    // Fixed: was using `=` (assignment) instead of `===` (comparison),
    // which silently overwrote borrowedBooks.length-derived state.
    return this.borrowedBooks.length < this.maxBooks;
  }

  borrowBook(book) {
    if (!this.canBorrow()) {
      throw new Error(`${this.name} has reached the borrowing limit (${this.maxBooks})`);
    }
    book.checkOut();
    this.borrowedBooks.push(book);
    return this;
  }

  returnBook(isbn) {
    const index = this.borrowedBooks.findIndex((b) => b.isbn === isbn);
    if (index === -1) {
      throw new Error(`Member ${this.name} has no book with ISBN ${isbn}`);
    }
    const [book] = this.borrowedBooks.splice(index, 1);
    book.returnCopy();
    return book;
  }

  getMembershipDuration() {
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.floor((Date.now() - this.joinDate.getTime()) / msPerDay);
    return Math.max(days, 0);
  }

  getMemberInfo() {
    // Destructuring used to pull fields off `this` for return shaping.
    const { name, memberId, borrowedBooks } = this;
    return {
      name,
      memberId,
      booksOut: borrowedBooks.length,
      membershipDays: this.getMembershipDuration(),
    };
  }
}

/* ----------------------------------------------------------------------- */
/* PremiumMember (inherits Member)                                         */
/* ----------------------------------------------------------------------- */

export class PremiumMember extends Member {
  constructor(name, memberId, joinDate = new Date(), perks = []) {
    super(name, memberId, joinDate);
    // Rest/spread example: copy incoming perks array defensively.
    this.perks = [...perks];
  }

  get maxBooks() {
    return MAX_BOOKS_PER_PREMIUM_MEMBER;
  }

  // Override: premium members get the higher limit via maxBooks above,
  // but we keep an explicit override here to demonstrate the inheritance
  // chain and allow future premium-only borrowing rules.
  canBorrow() {
    return this.borrowedBooks.length < this.maxBooks;
  }

  addPerk(...newPerks) {
    // Rest parameter example.
    this.perks.push(...newPerks);
    return this.perks;
  }
}

/* ----------------------------------------------------------------------- */
/* Pure / functional query helpers                                         */
/* ----------------------------------------------------------------------- */

// Pure function: same input -> same output, no mutation, no side effects.
export function getBooksByAuthor(books, author) {
  assertType(Array.isArray(books), 'books must be an array');
  if (!isNonEmptyString(author)) return [];
  return books.filter((book) => book.author.toLowerCase() === author.toLowerCase());
}

// Pure function using filter + some.
export function searchBooksByCategory(books, category) {
  assertType(Array.isArray(books), 'books must be an array');
  if (category === null || category === undefined || category === 'all') {
    return [...books];
  }
  return books.filter(
    (book) => typeof book.category === 'string' && book.category === category
  );
}

// Pure function using reduce.
export function calculateTotalLateFees(members, feePerDay = 0.25) {
  assertType(Array.isArray(members), 'members must be an array');
  return members.reduce((total, member) => {
    const overdue = member.borrowedBooks.filter((b) => b.daysOverdue > 0);
    const memberFees = overdue.reduce((sum, b) => sum + b.daysOverdue * feePerDay, 0);
    return total + memberFees;
  }, 0);
}

// Pure function using reduce + find-like comparison.
export function getMostPopularBook(borrowHistory) {
  assertType(Array.isArray(borrowHistory), 'borrowHistory must be an array');
  if (borrowHistory.length === 0) return null;

  const counts = borrowHistory.reduce((acc, isbn) => {
    acc[isbn] = (acc[isbn] || 0) + 1;
    return acc;
  }, {});

  const [topIsbn] = Object.entries(counts).reduce((best, entry) =>
    entry[1] > best[1] ? entry : best
  );
  return topIsbn;
}

// Higher-order function: returns a filter predicate.
export function makeAvailabilityFilter(requireAvailable = true) {
  return function availabilityPredicate(book) {
    return book.isAvailable() === requireAvailable;
  };
}

// Higher-order function: composes a search across multiple predicates.
export function composeFilters(...predicates) {
  return function combined(item) {
    return predicates.every((predicate) => predicate(item));
  };
}

export function findMemberById(members, memberId) {
  assertType(Array.isArray(members), 'members must be an array');
  // Fixed: was `=` instead of `===` inside the find callback.
  return members.find((member) => member.memberId === memberId) || null;
}

// Recursive function #1: with proper base case (was previously missing
// a base case entirely, causing stack overflow on every call).
export function countAvailableCopiesRecursive(books, index = 0) {
  if (!Array.isArray(books) || index >= books.length) {
    return 0; // base case
  }
  return books[index].availableCopies + countAvailableCopiesRecursive(books, index + 1);
}

// Recursive function #2: binary search by ISBN on a sorted array, with a
// proper base case for "not found" and "found".
export function findBookByIsbnRecursive(sortedBooks, isbn, low = 0, high = sortedBooks.length - 1) {
  if (low > high) return null; // base case: not found
  const mid = Math.floor((low + high) / 2);
  const midIsbn = sortedBooks[mid].isbn;

  if (midIsbn === isbn) return sortedBooks[mid]; // base case: found
  if (midIsbn < isbn) return findBookByIsbnRecursive(sortedBooks, isbn, mid + 1, high);
  return findBookByIsbnRecursive(sortedBooks, isbn, low, mid - 1);
}

// Spread operator example: merge two book collections without mutation.
export function combineBookCollections(collectionA, collectionB) {
  assertType(Array.isArray(collectionA) && Array.isArray(collectionB), 'both collections must be arrays');
  return [...collectionA, ...collectionB];
}

// Rest parameter example: accept any number of books to add at once.
export function addMultipleBooks(library, ...newBooks) {
  assertType(Array.isArray(library), 'library must be an array');
  newBooks.forEach((book) => {
    if (!(book instanceof Book)) {
      throw new TypeError('addMultipleBooks: every argument must be a Book instance');
    }
  });
  return [...library, ...newBooks];
}

/* ----------------------------------------------------------------------- */
/* LibraryStats                                                            */
/* ----------------------------------------------------------------------- */

export const LibraryStats = {
  totalBooksCount(books) {
    return books.reduce((sum, book) => sum + book.totalCopies, 0);
  },

  // Uses Math object for calculations, as required.
  averageCopiesPerTitle(books) {
    if (books.length === 0) return 0;
    const total = this.totalBooksCount(books);
    return Math.round((total / books.length) * 100) / 100;
  },

  // Uses a for-of loop, as required.
  countByCategory(books) {
    const counts = {};
    for (const book of books) {
      const category = book.category || 'uncategorised';
      counts[category] = (counts[category] || 0) + 1;
    }
    return counts;
  },

  // Returns an object built with destructuring, as required.
  getAvailabilitySummary(books) {
    const available = books.filter((b) => b.isAvailable()).length;
    const unavailable = books.length - available;
    const summary = { available, unavailable, total: books.length };
    const { available: availableCopies, total } = summary;
    return { ...summary, availabilityRate: total === 0 ? 0 : Math.round((availableCopies / total) * 100) };
  },

  mostBorrowedAuthor(books, borrowHistory) {
    const authorCounts = borrowHistory.reduce((acc, isbn) => {
      const book = books.find((b) => b.isbn === isbn);
      if (!book) return acc;
      acc[book.author] = (acc[book.author] || 0) + 1;
      return acc;
    }, {});
    const entries = Object.entries(authorCounts);
    if (entries.length === 0) return null;
    const [topAuthor] = entries.reduce((best, entry) => (entry[1] > best[1] ? entry : best));
    return topAuthor;
  },
};
