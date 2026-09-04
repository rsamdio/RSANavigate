import { DOMSnapshot, DemoDocument, StepDocument } from '@serverless-tour/common';

const DB_NAME = 'NavigateStudioDB';
const DB_VERSION = 1;
const STORE_SNAPSHOTS = 'snapshots';
const STORE_DRAFTS = 'drafts';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment.'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS);
      }
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

/**
 * Save a DOM snapshot to high-capacity IndexedDB
 */
export async function saveIdbSnapshot(key: string, snapshot: DOMSnapshot): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.put(snapshot, key);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveIdbSnapshot failed:', err);
  }
}

/**
 * Retrieve a DOM snapshot from IndexedDB by key
 */
export async function getIdbSnapshot(key: string): Promise<DOMSnapshot | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getIdbSnapshot error:', err);
    return null;
  }
}

/**
 * Retrieve first matching snapshot across multiple candidate keys in a single transaction (<2ms)
 */
export async function getIdbSnapshotAny(candidateKeys: string[]): Promise<DOMSnapshot | null> {
  if (!candidateKeys || candidateKeys.length === 0) return null;
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);

      let idx = 0;
      const tryNext = () => {
        if (idx >= candidateKeys.length) {
          resolve(null);
          return;
        }
        const key = candidateKeys[idx++];
        if (!key) {
          tryNext();
          return;
        }
        const req = store.get(key);
        req.onsuccess = () => {
          if (req.result) {
            resolve(req.result);
          } else {
            tryNext();
          }
        };
        req.onerror = () => tryNext();
      };

      tryNext();
    });
  } catch (err) {
    console.warn('getIdbSnapshotAny notice:', err);
    return null;
  }
}

/**
 * Fuzzy search IndexedDB snapshot store by key pattern/prefix if exact keys miss
 */
export async function findMatchingIdbSnapshot(patterns: string[]): Promise<DOMSnapshot | null> {
  if (!patterns || patterns.length === 0) return null;
  const validPatterns = patterns.filter((p) => Boolean(p && p.length > 3));
  if (validPatterns.length === 0) return null;

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.openCursor();

      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (!cursor) {
          resolve(null);
          return;
        }
        const keyStr = String(cursor.key);
        for (const pattern of validPatterns) {
          if (keyStr.includes(pattern) || pattern.includes(keyStr)) {
            resolve(cursor.value as DOMSnapshot);
            return;
          }
        }
        cursor.continue();
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Retrieve all snapshots belonging to a demo from IndexedDB
 */
export async function getAllIdbSnapshotsForDemo(demoId: string): Promise<Record<string, DOMSnapshot>> {
  const result: Record<string, DOMSnapshot> = {};
  if (!demoId) return result;

  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.openCursor();

      req.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (!cursor) {
          resolve(result);
          return;
        }
        const keyStr = String(cursor.key);
        if (keyStr.includes(demoId)) {
          result[keyStr] = cursor.value as DOMSnapshot;
        }
        cursor.continue();
      };
      req.onerror = () => resolve(result);
    });
  } catch {
    return result;
  }
}

/**
 * Save a full draft (demo metadata + steps) to IndexedDB
 */
export async function saveIdbDraft(
  demoId: string,
  demo: DemoDocument,
  steps: StepDocument[]
): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_DRAFTS], 'readwrite');
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.put({ demo, steps, updatedAt: Date.now() }, demoId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('saveIdbDraft failed:', err);
  }
}

/**
 * Get a full draft from IndexedDB
 */
export async function getIdbDraft(
  demoId: string
): Promise<{ demo: DemoDocument; steps: StepDocument[] } | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_DRAFTS], 'readonly');
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.get(demoId);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('getIdbDraft error:', err);
    return null;
  }
}

/**
 * Delete a draft from IndexedDB
 */
export async function deleteIdbDraft(demoId: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_DRAFTS], 'readwrite');
      const store = tx.objectStore(STORE_DRAFTS);
      const req = store.delete(demoId);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('deleteIdbDraft error:', err);
  }
}

/**
 * Bulk-delete all snapshot entries in IndexedDB whose key contains the given demoId.
 * Called when a guide is deleted to prevent unbounded IndexedDB storage growth.
 */
export async function deleteIdbSnapshotsForDemo(demoId: string): Promise<void> {
  if (!demoId) return;
  try {
    const db = await getDB();
    return new Promise<void>((resolve) => {
      const tx = db.transaction([STORE_SNAPSHOTS], 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.openCursor();
      const keysToDelete: IDBValidKey[] = [];

      req.onsuccess = (e: any) => {
        const cursor: IDBCursorWithValue | null = e.target.result;
        if (!cursor) {
          // All cursors traversed — now delete collected keys
          if (keysToDelete.length === 0) {
            resolve();
            return;
          }
          keysToDelete.forEach((key) => store.delete(key));
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
          return;
        }
        const keyStr = String(cursor.key);
        if (keyStr.includes(demoId)) {
          keysToDelete.push(cursor.key);
        }
        cursor.continue();
      };

      req.onerror = () => {
        console.warn(`deleteIdbSnapshotsForDemo: cursor error for ${demoId}`);
        resolve();
      };
    });
  } catch (err) {
    console.warn('deleteIdbSnapshotsForDemo error:', err);
  }
}
