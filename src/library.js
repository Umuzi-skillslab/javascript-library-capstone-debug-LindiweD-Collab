

// ── Constants ────────────────────────────────────────────────────────────
export const MAX_BOOKS_PER_MEMBER = 5;
export const PREMIUM_MAX_BOOKS_PER_MEMBER = 10;
const DAILY_LATE_FEE_RANDS = 2;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ── Validation helpers (used across constructors/methods) ──────────────
function assertNonEmptyString(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
}

function assertPositiveNumber(value, fieldName) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new TypeError(`${fieldName} must be a non-negative number`);
  }
}

// ── Book ─────────────────────────────────────────────────────────────────
export class Book {
  constructor(isbn, title, author, category, totalCopies = 1) {
    assertNonEmptyString(isbn, 'isbn');
    assertNonEmptyString(title, 'title');
    assertNonEmptyString(author, 'author');
    assertNonEmptyString(category, 'category');
    assertPositiveNumber(totalCopies, 'totalCopies');

    this.isbn = isbn;
    this.title = title;
    this.author = author;
    this.category = category;
    this.totalCopies = totalCopies;
    this.availableCopies = totalCopies;
  }

  isAvailable() {
    return this.availableCopies > 0;
  }

  getInfo() {
    return `${this.title} by ${this.author} [${this.category}] — ${this.availableCopies}/${this.totalCopies} available`;
  }

  checkOut() {
    if (!this.isAvailable()) {
      throw new Error(`No available copies of "${this.title}"`);
    }
    this.availableCopies -= 1;
    return this;
  }

  checkIn() {
    if (this.availableCopies < this.totalCopies) {
      this.availableCopies += 1;
    }
    return this;
  }
}

// ── DigitalBook (inheritance chain #1) ──────────────────────────────────
export class DigitalBook extends Book {
  constructor(isbn, title, author, category, fileFormat = 'EPUB') {
    // Digital books are never "out of stock" — model that as Infinity
    // copies rather than special-casing availability everywhere else.
    super(isbn, title, author, category, Infinity);
    assertNonEmptyString(fileFormat, 'fileFormat');
    this.fileFormat = fileFormat;
    this.downloadCount = 0;
  }

  isAvailable() {
    return true;
  }

  download() {
    this.downloadCount += 1;
    return `Downloading "${this.title}" as ${this.fileFormat}... (${this.downloadCount} total downloads)`;
  }

  getInfo() {
    return `${super.getInfo()} — Digital (${this.fileFormat})`;
  }
}

// ── Member ───────────────────────────────────────────────────────────────
export class Member {
  constructor(id, name, email) {
    assertNonEmptyString(id, 'id');
    assertNonEmptyString(name, 'name');
    assertNonEmptyString(email, 'email');

    this.id = id;
    this.name = name;
    this.email = email;
    this.joinDate = new Date();
    this.borrowedBooks = [];
    this.lateFees = 0;
  }

  canBorrow(maxBooks = MAX_BOOKS_PER_MEMBER) {
    return this.borrowedBooks.length < maxBooks;
  }

  getMembershipDuration() {
    const now = new Date();
    return Math.floor((now - this.joinDate) / MS_PER_DAY);
  }

  getMemberInfo() {
    // Object destructuring straight from `this`.
    const { id, name, email, joinDate, borrowedBooks } = this;
    return `${name} (ID: ${id}, ${email}) — member since ${joinDate.toDateString()}, ${borrowedBooks.length} book(s) borrowed`;
  }
}

// ── PremiumMember (inheritance chain #2) ────────────────────────────────
export class PremiumMember extends Member {
  constructor(id, name, email) {
    super(id, name, email);
    this.isPremium = true;
    this.discountRate = 0.5;
  }

  canBorrow() {
    return super.canBorrow(PREMIUM_MAX_BOOKS_PER_MEMBER);
  }
}

// ── Recursive functions (2, both with explicit base cases) ─────────────


export function findBookRecursive(books, isbn, index = 0) {
  if (!Array.isArray(books)) {
    throw new TypeError('books must be an array');
  }
  if (index >= books.length) {
    return undefined; // base case: exhausted the array
  }
  if (books[index].isbn === isbn) {
    return books[index]; // base case: found it
  }
  return findBookRecursive(books, isbn, index + 1);
}


export function sumFeesRecursive(fees) {
  if (!Array.isArray(fees) || fees.length === 0) {
    return 0; // base case: empty array
  }
  const [first, ...rest] = fees;
  return first + sumFeesRecursive(rest);
}

// ── Library ──────────────────────────────────────────────────────────────
export class Library {
  constructor() {
    this.books = [];
    this.members = [];
  }

  // -- Book management --

  addBook(book) {
    if (!(book instanceof Book)) {
      throw new TypeError('addBook requires a Book (or subclass) instance');
    }
    this.books.push(book);
    return book;
  }

  
  addMultipleBooks(...booksToAdd) {
    for (const book of booksToAdd) {
      this.addBook(book);
    }
    return this.books;
  }

  removeBook(isbn) {
    assertNonEmptyString(isbn, 'isbn');
    const index = this.books.findIndex(b => b.isbn === isbn);
    if (index === -1) {
      return false;
    }
    this.books.splice(index, 1);
    return true;
  }

  findBookByIsbn(isbn) {
    assertNonEmptyString(isbn, 'isbn');
    return this.books.find(book => book.isbn === isbn);
  }

  searchBooksByTitle(query) {
    if (typeof query !== 'string') {
      return [];
    }
    const lowerQuery = query.trim().toLowerCase();
    if (lowerQuery === '') {
      return [...this.books];
    }
    return this.books.filter(book => book.title.toLowerCase().includes(lowerQuery));
  }

  getBooksByAuthor(author) {
    assertNonEmptyString(author, 'author');
    return this.books.filter(book => book.author === author);
  }

  getBooksByCategory(category) {
    assertNonEmptyString(category, 'category');
    const matches = [];
    for (const book of this.books) {
      if (book.category === category) {
        matches.push(book);
      }
    }
    return matches;
  }

  getAvailableBooks() {
    return this.books.filter(book => book.isAvailable());
  }

  hasAnyAvailableBook() {
    return this.books.some(book => book.isAvailable());
  }

  allBooksAvailable() {
    return this.books.every(book => book.isAvailable());
  }

  
  combineBookCollections(...collections) {
    return [...this.books, ...collections.flat()];
  }

  // -- Member management --

  addMember(member) {
    if (!(member instanceof Member)) {
      throw new TypeError('addMember requires a Member (or subclass) instance');
    }
    this.members.push(member);
    return member;
  }

  findMemberById(id) {
    assertNonEmptyString(id, 'id');
    return this.members.find(member => member.id === id);
  }

  // -- Borrowing / returning --

  borrowBook(memberId, isbn) {
    try {
      assertNonEmptyString(memberId, 'memberId');
      assertNonEmptyString(isbn, 'isbn');

      const member = this.findMemberById(memberId);
      if (member === undefined) {
        throw new Error(`No member found with id "${memberId}"`);
      }

      const book = this.findBookByIsbn(isbn);
      if (book === undefined) {
        throw new Error(`No book found with isbn "${isbn}"`);
      }

      if (!member.canBorrow()) {
        throw new Error(`${member.name} has reached their borrowing limit`);
      }

      book.checkOut();
      member.borrowedBooks.push({ isbn: book.isbn, borrowedAt: new Date() });
      return { success: true, book, member };

    } catch (error) {
      console.error(`[borrowBook] ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  returnBook(memberId, isbn) {
    try {
      assertNonEmptyString(memberId, 'memberId');
      assertNonEmptyString(isbn, 'isbn');

      const member = this.findMemberById(memberId);
      if (member === undefined) {
        throw new Error(`No member found with id "${memberId}"`);
      }

      const book = this.findBookByIsbn(isbn);
      if (book === undefined) {
        throw new Error(`No book found with isbn "${isbn}"`);
      }

      const recordIndex = member.borrowedBooks.findIndex(entry => entry.isbn === isbn);
      if (recordIndex === -1) {
        throw new Error(`${member.name} has not borrowed "${book.title}"`);
      }

      member.borrowedBooks.splice(recordIndex, 1);
      book.checkIn();
      return { success: true, book, member };

    } catch (error) {
      console.error(`[returnBook] ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // -- Reporting (reduce-based) --

  calculateTotalLateFees() {
    return this.members.reduce((total, member) => total + member.lateFees, 0);
  }

  getMostPopularBook() {
    if (this.books.length === 0) {
      return undefined;
    }
    // "Popularity" modeled as copies currently checked out.
    return this.books.reduce((mostPopular, current) => {
      const currentCheckedOut = current.totalCopies - current.availableCopies;
      const mostPopularCheckedOut = mostPopular.totalCopies - mostPopular.availableCopies;
      return currentCheckedOut > mostPopularCheckedOut ? current : mostPopular;
    }, this.books[0]);
  }

  // -- Import / export --

  exportLibraryData() {
    const payload = {
      books: this.books.map(({ isbn, title, author, category, totalCopies, availableCopies }) => (
        { isbn, title, author, category, totalCopies, availableCopies }
      )),
      members: this.members.map(({ id, name, email, joinDate, borrowedBooks, lateFees }) => (
        { id, name, email, joinDate, borrowedBooks, lateFees }
      )),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(payload, null, 2);
  }

  importLibraryData(jsonString) {
    try {
      if (typeof jsonString !== 'string' || jsonString.trim() === '') {
        throw new Error('Import data must be a non-empty string');
      }
      const parsed = JSON.parse(jsonString);
      if (!parsed || !Array.isArray(parsed.books)) {
        throw new Error('Invalid library data format — missing books array');
      }

      this.books = parsed.books.map(b => {
        const book = new Book(b.isbn, b.title, b.author, b.category, b.totalCopies);
        book.availableCopies = b.availableCopies;
        return book;
      });

      return { success: true, booksImported: this.books.length };

    } catch (error) {
      console.error(`[importLibraryData] ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// ── LibraryStats ─────────────────────────────────────────────────────────
export const LibraryStats = {
  getAverageCopiesPerBook(books) {
    if (!Array.isArray(books) || books.length === 0) {
      return 0;
    }
    const total = books.reduce((sum, book) => sum + book.totalCopies, 0);
    return Math.round((total / books.length) * 100) / 100;
  },

  getCategoryBreakdown(books) {
    if (!Array.isArray(books)) {
      return {};
    }
    const counts = {};
    for (const book of books) {
      counts[book.category] = (counts[book.category] || 0) + 1;
    }
    return counts;
  },

  getLibrarySummary(books, members) {
    const safeBooks = Array.isArray(books) ? books : [];
    const safeMembers = Array.isArray(members) ? members : [];

    const totalBooks = safeBooks.length;
    const totalAvailable = safeBooks.filter(book => book.isAvailable()).length;
    const totalMembers = safeMembers.length;
    const utilisationRate = totalBooks === 0
      ? 0
      : Math.round(((totalBooks - totalAvailable) / totalBooks) * 100);

    return { totalBooks, totalAvailable, totalMembers, utilisationRate };
  },
};
