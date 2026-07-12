/**
 * @jest-environment jsdom
 */
import {
  library,
  renderBookCatalogue,
  renderMemberList,
  displayBookDetails,
  updateStatsDisplay,
  initApp,
} from '../src/ui.js';
import { Book, Member } from '../src/library.js';

function setupDom() {
  document.body.innerHTML = `
    <section id="stats-panel"></section>
    <input type="text" id="search-input" />
    <select id="filter-category">
      <option value="all">All</option>
      <option value="Fiction">Fiction</option>
    </select>
    <input type="text" id="active-member-id" />
    <div id="book-catalogue"></div>
    <form id="add-book-form">
      <input id="book-isbn" />
      <input id="book-title" />
      <input id="book-author" />
      <input id="book-category" value="Fiction" />
      <input id="book-copies" value="1" />
      <button type="submit">Add</button>
    </form>
    <form id="add-member-form">
      <input id="member-id" />
      <input id="member-name" />
      <input id="member-email" />
      <input type="checkbox" id="member-premium" />
      <button type="submit">Add</button>
    </form>
    <div id="member-list"></div>
    <button id="save-btn"></button>
    <button id="load-btn"></button>
    <button id="export-btn"></button>
  `;
}

beforeEach(() => {
  setupDom();
  library.books = [];
  library.members = [];
});

describe('renderBookCatalogue', () => {
  test('renders a card per book', () => {
    const books = [new Book('D1', 'Dune', 'Frank Herbert', 'Fiction', 1)];
    const container = document.querySelector('#book-catalogue');
    renderBookCatalogue(books, container);
    expect(container.querySelectorAll('.book-card')).toHaveLength(1);
    expect(container.textContent).toContain('Dune');
  });

  test('shows an empty state message for an empty array', () => {
    const container = document.querySelector('#book-catalogue');
    renderBookCatalogue([], container);
    expect(container.querySelector('.empty-state')).not.toBeNull();
  });

  test('does nothing (no throw) when container is null', () => {
    expect(() => renderBookCatalogue([], null)).not.toThrow();
  });

  test('clears previous content before re-rendering', () => {
    const container = document.querySelector('#book-catalogue');
    renderBookCatalogue([new Book('D2', 'A', 'Author', 'Fiction', 1)], container);
    renderBookCatalogue([new Book('D3', 'B', 'Author', 'Fiction', 1)], container);
    expect(container.querySelectorAll('.book-card')).toHaveLength(1);
  });
});

describe('renderMemberList', () => {
  test('renders a row per member', () => {
    const members = [new Member('M1', 'Sipho', 'sipho@example.com')];
    const container = document.querySelector('#member-list');
    renderMemberList(members, container);
    expect(container.querySelectorAll('.member-row')).toHaveLength(1);
  });
});

describe('displayBookDetails / updateStatsDisplay', () => {
  test('displayBookDetails renders book info', () => {
    const container = document.createElement('div');
    const book = new Book('D4', 'Dune', 'Frank Herbert', 'Fiction', 1);
    displayBookDetails(book, container);
    expect(container.textContent).toContain('Dune');
  });

  test('updateStatsDisplay renders destructured stats', () => {
    const container = document.createElement('div');
    updateStatsDisplay({ totalBooks: 5, totalAvailable: 3, totalMembers: 2, utilisationRate: 40 }, container);
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('40%');
  });
});

describe('initApp — forms and event delegation', () => {
  test('submitting the add-book form adds a book and clears the form', () => {
    initApp();

    document.querySelector('#book-isbn').value = 'N1';
    document.querySelector('#book-title').value = 'New Title';
    document.querySelector('#book-author').value = 'New Author';
    document.querySelector('#book-copies').value = '2';

    const form = document.querySelector('#add-book-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(library.books.find(b => b.isbn === 'N1')).toBeDefined();
  });

  test('submitting the add-member form adds a member', () => {
    initApp();

    document.querySelector('#member-id').value = 'MX1';
    document.querySelector('#member-name').value = 'Palesa';
    document.querySelector('#member-email').value = 'palesa@example.com';

    const form = document.querySelector('#add-member-form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(library.findMemberById('MX1')).toBeDefined();
  });

  test('clicking a borrow button (event delegation) borrows the book', () => {
    library.addBook(new Book('D5', 'Dune', 'Frank Herbert', 'Fiction', 1));
    library.addMember(new Member('M2', 'Naledi', 'naledi@example.com'));
    initApp();

    document.querySelector('#active-member-id').value = 'M2';

    const button = document.querySelector('.borrow-btn[data-isbn="D5"]');
    expect(button).not.toBeNull();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(library.findBookByIsbn('D5').availableCopies).toBe(0);
  });

  test('clicking remove-member (event delegation) removes the member', () => {
    library.addMember(new Member('M3', 'Zanele', 'zanele@example.com'));
    initApp();

    const button = document.querySelector('.remove-member-btn[data-member-id="M3"]');
    expect(button).not.toBeNull();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(library.findMemberById('M3')).toBeUndefined();
  });

  test('changing the category filter re-renders the catalogue', () => {
    library.addBook(new Book('D6', 'Dune', 'Frank Herbert', 'Fiction', 1));
    initApp();

    const filter = document.querySelector('#filter-category');
    filter.value = 'Fiction';
    filter.dispatchEvent(new Event('change', { bubbles: true }));

    const container = document.querySelector('#book-catalogue');
    expect(container.textContent).toContain('Dune');
  });
});
