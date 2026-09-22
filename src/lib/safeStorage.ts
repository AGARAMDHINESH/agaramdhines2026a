/**
 * Resilient Storage Manager with IndexedDB cache for large collections,
 * automated quota recovery, and global protection against QuotaExceededError.
 * 
 * Prevents "Setting the value of ... exceeded the quota" and
 * "@firebase/firestore: Failed to set zombie client id." crashes by keeping
 * localStorage usage under ~50KB and offloading megabyte-scale collections to IndexedDB.
 */

const DB_NAME = 'agaram_offline_cache';
const DB_VERSION = 1;
const STORE_NAME = 'collections';

// Large collection keys that must NEVER be stored in the 5MB localStorage
const LARGE_COLLECTION_KEYS = new Set([
  'students',
  'courses',
  'allUnifiedLinks',
  'dailyWorkUploads',
  'forms',
  'formSubmissions',
  'staffs',
  'youtubeLinks',
  'courseMaterials',
  'tamilAsanKnowledge',
  'subjects',
  'notification_history',
  'agaram_tamil_asan_student_history_v1'
]);

// Fast in-memory cache for synchronous reads
const memoryStore = new Map<string, string>();

let idbPromise: Promise<IDBDatabase | null> | null = null;

function getIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!idbPromise) {
    idbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = (e: any) => {
          resolve(e.target.result);
        };
        req.onerror = () => {
          resolve(null);
        };
      } catch (_) {
        resolve(null);
      }
    });
  }
  return idbPromise;
}

function saveToIndexedDb(key: string, value: string): void {
  getIndexedDB().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
    } catch (_) {}
  }).catch(() => {});
}

function removeFromIndexedDb(key: string): void {
  getIndexedDB().then((db) => {
    if (!db) return;
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
    } catch (_) {}
  }).catch(() => {});
}

/**
 * Aggressively scans and purges bloated items from localStorage to ensure
 * Firebase and ephemeral notifications have plentiful free quota (>4.5MB).
 */
export function purgeBloatedStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // 1. Stale timetable notifications from previous dates
      if (key.startsWith('notified_tt_') && !key.includes(today)) {
        keysToRemove.push(key);
        continue;
      }

      // 2. Large collections must be offloaded from localStorage to IndexedDB / memory
      if (LARGE_COLLECTION_KEYS.has(key)) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            memoryStore.set(key, val);
            saveToIndexedDb(key, val);
          }
        } catch (_) {}
        keysToRemove.push(key);
        continue;
      }

      // 3. Any key storing large payloads (> 15,000 characters)
      try {
        const val = localStorage.getItem(key);
        if (val && val.length > 15000) {
          memoryStore.set(key, val);
          saveToIndexedDb(key, val);
          keysToRemove.push(key);
          continue;
        }
      } catch (_) {}

      // 4. Stale timestamp metadata and temporary metrics
      if (key.endsWith('_lastSavedAt') || key === 'dbMetricsStats' || key === 'dismissedAds') {
        keysToRemove.push(key);
        continue;
      }
    }

    // Remove identified bloated keys
    for (const k of keysToRemove) {
      try {
        localStorage.removeItem(k);
      } catch (_) {}
    }

    // 5. Cap any tombstone lists (*_deleted)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.endsWith('_deleted')) {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            const arr = JSON.parse(val);
            if (Array.isArray(arr) && arr.length > 20) {
              const capped = JSON.stringify(arr.slice(-20));
              localStorage.setItem(key, capped);
            }
          }
        } catch (_) {
          try { localStorage.removeItem(key); } catch (__) {}
        }
      }
    }
  } catch (err) {
    console.debug('purgeBloatedStorage notice:', err);
  }
}

// Backward compatibility alias
export const pruneStorage = purgeBloatedStorage;
export const deepPruneStorage = purgeBloatedStorage;

/**
 * Safely writes to storage. Large collections are transparently routed to
 * IndexedDB + memoryStore, preventing localStorage quota exhaustion.
 */
export function safeSetItem(key: string, value: string): boolean {
  // Always update memoryStore immediately for synchronous access
  memoryStore.set(key, value);

  if (typeof window === 'undefined' || !window.localStorage) {
    return true;
  }

  // If item is a large collection or exceeds 15KB, store in IndexedDB and keep out of localStorage
  if (LARGE_COLLECTION_KEYS.has(key) || value.length > 15000) {
    saveToIndexedDb(key, value);
    try {
      // Ensure it's not wasting space in localStorage
      localStorage.removeItem(key);
    } catch (_) {}
    return true;
  }

  // Small configuration / flag / token items can be saved in localStorage
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      String(err?.message || '').toLowerCase().includes('quota');

    if (isQuota) {
      purgeBloatedStorage();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (_) {
        // Fallback to sessionStorage if localStorage is blocked by system policies
        try {
          sessionStorage.setItem(key, value);
        } catch (__) {}
        return true;
      }
    }
    return false;
  }
}

/**
 * Safely retrieves an item from memoryStore, localStorage, or sessionStorage.
 */
export function safeGetItem(key: string, defaultValue: string | null = null): string | null {
  // 1. Fast in-memory hit
  if (memoryStore.has(key)) {
    return memoryStore.get(key) ?? defaultValue;
  }

  // 2. Check localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const val = localStorage.getItem(key);
      if (val !== null) {
        memoryStore.set(key, val);
        return val;
      }
    } catch (_) {}
  }

  // 3. Check sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const sVal = sessionStorage.getItem(key);
      if (sVal !== null) {
        memoryStore.set(key, sVal);
        return sVal;
      }
    } catch (_) {}
  }

  return defaultValue;
}

/**
 * Asynchronous retrieval that also checks IndexedDB for large persisted collections.
 */
export async function safeGetItemAsync(key: string, defaultValue: string | null = null): Promise<string | null> {
  const syncVal = safeGetItem(key, null);
  if (syncVal !== null) return syncVal;

  const db = await getIndexedDB();
  if (!db) return defaultValue;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => {
        const res = req.result ?? defaultValue;
        if (res !== null) {
          memoryStore.set(key, res);
        }
        resolve(res);
      };
      req.onerror = () => resolve(defaultValue);
    } catch (_) {
      resolve(defaultValue);
    }
  });
}

/**
 * Safely removes an item across all storage tiers.
 */
export function safeRemoveItem(key: string): void {
  memoryStore.delete(key);
  removeFromIndexedDb(key);

  if (typeof window !== 'undefined') {
    try { localStorage.removeItem(key); } catch (_) {}
    try { sessionStorage.removeItem(key); } catch (_) {}
  }
}

export const safeLocalStorage = {
  getItem: safeGetItem,
  setItem: safeSetItem,
  removeItem: safeRemoveItem
};

// Global interceptor on window.localStorage.setItem to prevent any third-party or Firebase uncaught QuotaExceededError
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    const rawSetItem = window.localStorage.setItem.bind(window.localStorage);
    window.localStorage.setItem = function (key: string, value: string) {
      try {
        rawSetItem(key, value);
      } catch (err: any) {
        const isQuota =
          err?.name === 'QuotaExceededError' ||
          err?.code === 22 ||
          err?.code === 1014 ||
          err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          String(err?.message || '').toLowerCase().includes('quota');

        if (isQuota) {
          purgeBloatedStorage();
          try {
            rawSetItem(key, value);
          } catch (_) {
            // Defend against uncaught crash by preserving in memoryStore
            memoryStore.set(key, value);
            try { sessionStorage.setItem(key, value); } catch (__) {}
          }
        } else {
          throw err;
        }
      }
    };
  } catch (_) {}

  // Run immediate purge upon loading the script
  try {
    purgeBloatedStorage();
  } catch (_) {}
}
