

const STORAGE_KEY = 'techbridge_library_data';

export function saveToLocalStorage(data) {
  try {
    if (data === null || data === undefined) {
      throw new Error('No data provided to save');
    }
    const serialized = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (error) {
    console.error(`[storage] Failed to save: ${error.message}`);
    return false;
  }
}

export function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === undefined) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[storage] Failed to load: ${error.message}`);
    return null;
  }
}

export function clearLocalStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error(`[storage] Failed to clear: ${error.message}`);
    return false;
  }
}
