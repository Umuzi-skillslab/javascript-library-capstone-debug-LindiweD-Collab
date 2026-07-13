import { Library, Book, Member, PremiumMember, LibraryStats } from './library.js';
import { debounce, isNonEmptyString } from './utils.js';
import { saveToLocalStorage, loadFromLocalStorage } from './storage.js';

export const library = new Library();

// ── Rendering ────────────────────────────────────────────────────────────

export function renderBookCatalogue(books, container) {
  if (container === null || container === undefined) {
    console.warn('[ui] renderBookCatalogue: container not found');
    return;
  }
  if (!Array.isArray(books)) {
    console.warn('[ui] renderBookCatalogue: books must be an array');
    return;
  }

  container.innerHTML = '';

  if (books.length === 0) {
    container.innerHTML = `<p class="empty-state">No books match your search.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const book of books) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.isbn = book.isbn;
    card.innerHTML = `
      <h3>${book.title}</h3>
      <p class="book-author">${book.author}</p>
      <p class="book-category">${book.category}</p>
      <p class="book-availability">${book.availableCopies}/${book.totalCopies} available</p>
      <button class="borrow-btn" data-isbn="${book.isbn}" ${book.isAvailable() ? '' : 'disabled'}>
        ${book.isAvailable() ? 'Borrow' : 'Unavailable'}
      </button>
    `;
    fragment.appendChild(card);
  }

  container.appendChild(fragment);
}

export function renderMemberList(members, container) {
  if (container === null || container === undefined) {
    console.warn('[ui] renderMemberList: container not found');
    return;
  }
  if (!Array.isArray(members)) {
    return;
  }

  container.innerHTML = '';
  const fragment = document.createDocumentFragment();

  for (const member of members) {
    const row = document.createElement('div');
    row.className = 'member-row';
    row.dataset.memberId = member.id;
    row.innerHTML = `
      <span>${member.getMemberInfo()}</span>
      <button class="remove-member-btn" data-member-id="${member.id}">Remove</button>
    `;
    fragment.appendChild(row);
  }

  container.appendChild(fragment);
}

export function displayBookDetails(book, container) {
  if (container === null || container === undefined || book === null || book === undefined) {
    return;
  }
  container.innerHTML = `
    <h2>${book.title}</h2>
    <p><strong>Author:</strong> ${book.author}</p>
    <p><strong>Category:</strong> ${book.category}</p>
    <p><strong>Availability:</strong> ${book.availableCopies}/${book.totalCopies}</p>
  `;
}

export function updateStatsDisplay(stats, container) {
  if (container === null || container === undefined || stats === null || stats === undefined) {
    return;
  }
  const { totalBooks, totalAvailable, totalMembers, utilisationRate } = stats;
  container.innerHTML = `
    <div class="stat"><span class="stat-value">${totalBooks}</span><span class="stat-label">Total Books</span></div>
    <div class="stat"><span class="stat-value">${totalAvailable}</span><span class="stat-label">Available</span></div>
    <div class="stat"><span class="stat-value">${totalMembers}</span><span class="stat-label">Members</span></div>
    <div class="stat"><span class="stat-value">${utilisationRate}%</span><span class="stat-label">Utilisation</span></div>
  `;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function refreshCatalogue() {
  const container = document.querySelector('#book-catalogue');
  const searchInput = document.querySelector('#search-input');
  const categoryFilter = document.querySelector('#filter-category');

  let books = library.books;

  if (searchInput !== null && searchInput.value.trim() !== '') {
    books = library.searchBooksByTitle(searchInput.value);
  }
  if (categoryFilter !== null && categoryFilter.value !== 'all') {
    books = books.filter(book => book.category === categoryFilter.value);
  }

  renderBookCatalogue(books, container);
}

function refreshStats() {
  const statsContainer = document.querySelector('#stats-panel');
  const summary = LibraryStats.getLibrarySummary(library.books, library.members);
  updateStatsDisplay(summary, statsContainer);
}

function refreshMembers() {
  const container = document.querySelector('#member-list');
  renderMemberList(library.members, container);
}

function refreshAll() {
  refreshCatalogue();
  refreshStats();
  refreshMembers();
}

// ── Event handlers ───────────────────────────────────────────────────────

function handleSearchInput() {
  refreshCatalogue();
}

function handleFilterChange() {
  refreshCatalogue();
}

function handleAddBookForm(event) {
  event.preventDefault();

  const form = event.target;
  const isbn = form.querySelector('#book-isbn')?.value.trim();
  const title = form.querySelector('#book-title')?.value.trim();
  const author = form.querySelector('#book-author')?.value.trim();
  const category = form.querySelector('#book-category')?.value.trim();
  const totalCopies = Number(form.querySelector('#book-copies')?.value);

  if (!isNonEmptyString(isbn) || !isNonEmptyString(title)) {
    console.warn('[ui] handleAddBookForm: missing required fields');
    return;
  }

  try {
    const book = new Book(isbn, title, author, category, totalCopies);
    library.addBook(book);
    form.reset();
    refreshAll();
  } catch (error) {
    console.error(`[ui] Could not add book: ${error.message}`);
  }
}

function handleAddMemberForm(event) {
  event.preventDefault();

  const form = event.target;
  const id = form.querySelector('#member-id')?.value.trim();
  const name = form.querySelector('#member-name')?.value.trim();
  const email = form.querySelector('#member-email')?.value.trim();
  const isPremium = form.querySelector('#member-premium')?.checked;

  try {
    const member = isPremium
      ? new PremiumMember(id, name, email)
      : new Member(id, name, email);
    library.addMember(member);
    form.reset();
    refreshAll();
  } catch (error) {
    console.error(`[ui] Could not add member: ${error.message}`);
  }
}


function handleCatalogueClick(event) {
  const button = event.target.closest('.borrow-btn');
  if (button === null) {
    return;
  }
  const isbn = button.dataset.isbn;
  const memberIdInput = document.querySelector('#active-member-id');
  const memberId = memberIdInput !== null ? memberIdInput.value.trim() : '';

  if (!isNonEmptyString(memberId)) {
    alert('Enter a member ID above before borrowing a book.');
    return;
  }

  const result = library.borrowBook(memberId, isbn);
  if (!result.success) {
    alert(result.error);
    return;
  }
  refreshAll();
}


function handleMemberListClick(event) {
  const button = event.target.closest('.remove-member-btn');
  if (button === null) {
    return;
  }
  const memberId = button.dataset.memberId;
  library.members = library.members.filter(member => member.id !== memberId);
  refreshAll();
}

function handleSaveClick() {
  const saved = saveToLocalStorage(library.exportLibraryData());
  alert(saved ? 'Library data saved.' : 'Could not save library data.');
}

function handleLoadClick() {
  const raw = loadFromLocalStorage();
  if (raw === null) {
    alert('No saved library data found.');
    return;
  }
  const result = library.importLibraryData(raw);
  alert(result.success ? `Loaded ${result.booksImported} book(s).` : result.error);
  refreshAll();
}

function handleExportClick() {
  const json = library.exportLibraryData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'library-export.json';
  link.click();
  URL.revokeObjectURL(url);
}

// ── App bootstrap ────────────────────────────────────────────────────────

export function initApp() {
  const searchInput = document.querySelector('#search-input');
  const categoryFilter = document.querySelector('#filter-category');
  const addBookForm = document.querySelector('#add-book-form');
  const addMemberForm = document.querySelector('#add-member-form');
  const catalogueContainer = document.querySelector('#book-catalogue');
  const memberListContainer = document.querySelector('#member-list');
  const saveButton = document.querySelector('#save-btn');
  const loadButton = document.querySelector('#load-btn');
  const exportButton = document.querySelector('#export-btn');

  // Listeners
  if (searchInput !== null) {
    searchInput.addEventListener('input', debounce(handleSearchInput, 250));
  }

  if (categoryFilter !== null) {
    categoryFilter.addEventListener('change', handleFilterChange);
  }

  if (addBookForm !== null) {
    addBookForm.addEventListener('submit', handleAddBookForm);
  }

  if (addMemberForm !== null) {
    addMemberForm.addEventListener('submit', handleAddMemberForm);
  }

  if (catalogueContainer !== null) {
    catalogueContainer.addEventListener('click', handleCatalogueClick);
  }
 
  if (memberListContainer !== null) {
    memberListContainer.addEventListener('click', handleMemberListClick);
  }
 
  if (saveButton !== null) {
    saveButton.addEventListener('click', handleSaveClick);
  }

  if (loadButton !== null) {
    loadButton.addEventListener('click', handleLoadClick);
  }

  if (exportButton !== null) {
    exportButton.addEventListener('click', handleExportClick);
  }

  refreshAll();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initApp);
}
