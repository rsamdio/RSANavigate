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
