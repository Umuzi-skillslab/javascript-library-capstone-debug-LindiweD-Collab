/**
 * storage.js — JSON serialisation and localStorage persistence.
 *
 * All JSON operations are wrapped in try-catch: malformed localStorage
 * data should never crash the app, only fail gracefully.
 */

const STORAGE_KEY = 'library-management-data';

export function exportLibraryData(books, members) {
  try {
    return JSON.stringify({ books, members, exportedAt: new Date().toISOString() }, null, 2);
  } catch (error) {
    throw new Error(`Failed to export library data: ${error.message}`);
  }
}

export function importLibraryData(jsonString) {
  if (typeof jsonString !== 'string' || jsonString.trim() === '') {
    throw new Error('importLibraryData: input must be a non-empty JSON string');
  }
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object' || !Array.isArray(data.books) || !Array.isArray(data.members)) {
      throw new Error('Imported data is missing required books/members arrays');
    }
    return data;
  } catch (error) {
    throw new Error(`Failed to import library data: ${error.message}`);
  }
}

export function saveToLocalStorage(books, members, storage = globalThis.localStorage) {
  if (!storage) {
    throw new Error('localStorage is not available in this environment');
  }
  try {
    const serialised = JSON.stringify({ books, members });
    storage.setItem(STORAGE_KEY, serialised);
    return true;
  } catch (error) {
    console.error(`saveToLocalStorage failed: ${error.message}`);
    return false;
  }
}

export function loadFromLocalStorage(storage = globalThis.localStorage) {
  if (!storage) {
    return null;
  }
  const raw = storage.getItem(STORAGE_KEY);
  // Null check after getItem — a missing key returns null, not "{}".
  if (raw === null || raw === undefined) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error(`loadFromLocalStorage failed to parse data: ${error.message}`);
    return null;
  }
}

export function clearLocalStorage(storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error(`clearLocalStorage failed: ${error.message}`);
    return false;
  }
}
