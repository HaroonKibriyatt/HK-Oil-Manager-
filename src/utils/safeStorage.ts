// In-memory fallback map if sessionStorage or localStorage is blocked by iframe or browser permissions
const memoryStorage = new Map<string, string>();

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (e) {
      // Storage restricted, fallback to in-memory
    }
    return memoryStorage.get(key) || null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      // Storage restricted, fallback to in-memory
    }
    memoryStorage.set(key, value);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
        return;
      }
    } catch (e) {
      // Storage restricted, fallback to in-memory
    }
    memoryStorage.delete(key);
  },
};
