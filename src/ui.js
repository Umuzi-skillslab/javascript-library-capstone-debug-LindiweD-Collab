/**
 * ui.js — DOM rendering and event handling.
 *
 * All DOM queries are null-checked before use (the starter code crashed
 * whenever an element was missing). Rendering uses a DocumentFragment to
 * avoid layout thrashing, and dynamic lists use event delegation instead
 * of attaching one listener per row.
 */

import {
  getBooksByAuthor,
  searchBooksByCategory,
  findMemberById,
  LibraryStats,
} from './library.js';
import { saveToLocalStorage, loadFromLocalStorage } from './storage.js';

/* ----------------------------------------------------------------------- */
/* Selector helpers                                                        */
/* ----------------------------------------------------------------------- */

function qs(selector, root = document) {
  const el = root.querySelector(selector);
  if (!el) {
    console.warn(`Element not found for selector: ${selector}`);
  }
  return el;
}

/* ----------------------------------------------------------------------- */
/* Rendering                                                                */
/* ----------------------------------------------------------------------- */

export function renderBookCatalogue(books, container) {
  if (!container) return; // null check before DOM manipulation

  // Clear existing content before re-rendering (the starter code
  // appended on every render, duplicating rows).
  container.innerHTML = '';

  const fragment = document.createDocumentFragment();

  books.forEach((book) => {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.isbn = book.isbn; // data attribute for delegated lookups

    // Template literal HTML generation, replacing string concatenation.
    card.innerHTML = `
      <h3>${book.title}</h3>
      <p class="book-author">by ${book.author}</p>
      <p class="book-availability">${book.availableCopies}/${book.totalCopies} available</p>
      <button class="borrow-btn" data-isbn="${book.isbn}" ${book.isAvailable() ? '' : 'disabled'}>
        ${book.isAvailable() ? 'Borrow' : 'Unavailable'}
      </button>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

export function displayBookDetails(book, container) {
  if (!container || !book) return;
  container.innerHTML = `
    <article class="book-details">
      <h2>${book.title}</h2>
      <p><strong>Author:</strong> ${book.author}</p>
      <p><strong>ISBN:</strong> ${book.isbn}</p>
      <p><strong>Availability:</strong> ${book.availableCopies} of ${book.totalCopies} copies</p>
    </article>
  `;
}

export function renderStatsDashboard(books, container) {
  if (!container) return;
  const summary = LibraryStats.getAvailabilitySummary(books);
  const avg = LibraryStats.averageCopiesPerTitle(books);

  container.innerHTML = `
    <ul class="stats-list">
      <li>Total titles: ${books.length}</li>
      <li>Available: ${summary.available}</li>
      <li>Unavailable: ${summary.unavailable}</li>
      <li>Availability rate: ${summary.availabilityRate}%</li>
      <li>Average copies per title: ${avg}</li>
    </ul>
  `;
}

/* ----------------------------------------------------------------------- */
/* Event handling                                                          */
/* ----------------------------------------------------------------------- */

export function handleFilterChange(event, books, container) {
  if (!event || !event.target) return;
  const category = event.target.value;
  // Fixed: was an assignment (`=`) instead of comparison logic.
  const filtered = category === 'all' ? books : searchBooksByCategory(books, category);
  renderBookCatalogue(filtered, container);
}

export function handleSearchInput(event, books, container) {
  if (!event || !event.target) return;
  const query = event.target.value.trim().toLowerCase();
  const results = query === '' ? books : getBooksByAuthor(books, query);
  renderBookCatalogue(results, container);
}

export function handleBorrowFormSubmit(event, members, books) {
  event.preventDefault(); // required: prevents page reload on submit

  const form = event.target;
  const memberId = form.elements.memberId?.value;
  const isbn = form.elements.isbn?.value;

  try {
    const member = findMemberById(members, memberId);
    const book = books.find((b) => b.isbn === isbn);

    if (!member) throw new Error(`No member found with ID ${memberId}`);
    if (!book) throw new Error(`No book found with ISBN ${isbn}`);

    member.borrowBook(book);
    saveToLocalStorage(books, members);
    return { success: true, member, book };
  } catch (error) {
    console.error(`Borrow failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Event delegation example #1: one listener on the container handles
// every "Borrow" button, including ones added after the initial render.
export function attachCatalogueDelegation(container, books, members, onBorrow) {
  if (!container) return;
  container.addEventListener('click', (event) => {
    const button = event.target.closest('.borrow-btn');
    if (!button) return;
    const { isbn } = button.dataset;
    const book = books.find((b) => b.isbn === isbn);
    if (book && typeof onBorrow === 'function') {
      onBorrow(book);
    }
  });
}

// Event delegation example #2: one listener handles all "remove member"
// actions inside the members table, however many rows exist.
export function attachMemberTableDelegation(tableBody, onRemove) {
  if (!tableBody) return;
  tableBody.addEventListener('click', (event) => {
    const button = event.target.closest('.remove-member-btn');
    if (!button) return;
    const { memberId } = button.dataset;
    if (memberId && typeof onRemove === 'function') {
      onRemove(memberId);
    }
  });
}

/* ----------------------------------------------------------------------- */
/* Initialisation                                                          */
/* ----------------------------------------------------------------------- */

export function initApp(state) {
  const catalogueEl = qs('#book-catalogue');
  const filterEl = qs('#filter-category');
  const searchEl = qs('#search-input');
  const statsEl = qs('#stats-dashboard');
  const borrowFormEl = qs('#borrow-form');
  const memberTableBodyEl = qs('#member-table-body');

  const saved = loadFromLocalStorage();
  if (saved) {
    Object.assign(state, saved);
  }

  if (catalogueEl) renderBookCatalogue(state.books, catalogueEl);
  if (statsEl) renderStatsDashboard(state.books, statsEl);

  if (filterEl) {
    // Fixed: was bound to "click" instead of "change".
    filterEl.addEventListener('change', (e) => handleFilterChange(e, state.books, catalogueEl));
  }

  if (searchEl) {
    searchEl.addEventListener('input', (e) => handleSearchInput(e, state.books, catalogueEl));
  }

  if (borrowFormEl) {
    borrowFormEl.addEventListener('submit', (e) => {
      const result = handleBorrowFormSubmit(e, state.members, state.books);
      if (result.success && catalogueEl) {
        renderBookCatalogue(state.books, catalogueEl);
        if (statsEl) renderStatsDashboard(state.books, statsEl);
      }
    });
  }

  attachCatalogueDelegation(catalogueEl, state.books, state.members, (book) => {
    console.log(`Borrow requested for "${book.title}"`);
  });

  attachMemberTableDelegation(memberTableBodyEl, (memberId) => {
    state.members = state.members.filter((m) => m.memberId !== memberId);
  });

  window.addEventListener('beforeunload', () => {
    saveToLocalStorage(state.books, state.members);
  });
}

// Wire up initialisation on DOMContentLoaded rather than running at
// parse-time (the starter code ran setup code before the DOM existed).
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined' && window.__LIBRARY_STATE__) {
      initApp(window.__LIBRARY_STATE__);
    }
  });
}
