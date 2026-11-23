export interface CachedInstructionSummary {
  id: string;
  title: string;
  difficulty: string;
  estimatedTime: number;
}

export interface OfflineQueueItem {
  id: string;
  type: 'vision' | 'recipe' | 'upcycle' | 'object';
  endpoint: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed';
}

const DB_NAME = 'masterok_offline_db';
const DB_VERSION = 1;
const STORE_CACHE = 'kv_cache';
const STORE_QUEUE = 'offline_queue';
const INSTRUCTIONS_KEY = 'instructions_v1';

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

export async function cacheInstructions(instructions: CachedInstructionSummary[]): Promise<void> {
  try {
    if (!hasIndexedDb()) {
      localStorage.setItem(INSTRUCTIONS_KEY, JSON.stringify(instructions));
      return;
    }
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, 'readwrite');
      tx.objectStore(STORE_CACHE).put({
        key: INSTRUCTIONS_KEY,
        value: instructions,
        updatedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Игнорируем ошибку квоты хранилища
  }
}

export async function getCachedInstructions(): Promise<CachedInstructionSummary[] | null> {
  try {
    if (!hasIndexedDb()) {
      const raw = localStorage.getItem(INSTRUCTIONS_KEY);
      return raw ? (JSON.parse(raw) as CachedInstructionSummary[]) : null;
    }
    const db = await openDb();
    const result = await new Promise<CachedInstructionSummary[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, 'readonly');
      const req = tx.objectStore(STORE_CACHE).get(INSTRUCTIONS_KEY);
      req.onsuccess = () => resolve(req.result?.value || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result;
  } catch {
    return null;
  }
}

export async function enqueueOfflineItem(
  item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'retries' | 'status'>
): Promise<OfflineQueueItem> {
  const fullItem: OfflineQueueItem = {
    ...item,
    id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    retries: 0,
    status: 'pending',
  };

  if (!hasIndexedDb()) {
    return fullItem;
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readwrite');
      tx.objectStore(STORE_QUEUE).put(fullItem);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Безопасный fallback без падения интерфейса
  }

  return fullItem;
}

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  if (!hasIndexedDb()) return [];
  try {
    const db = await openDb();
    const items = await new Promise<OfflineQueueItem[]>((resolve, reject) => {
      const tx = db.transaction(STORE_QUEUE, 'readonly');
      const req = tx.objectStore(STORE_QUEUE).getAll();
      req.onsuccess = () => resolve((req.result as OfflineQueueItem[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return items.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function flushOfflineQueue(apiBase: string = ''): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  const items = await getOfflineQueue();
  if (items.length === 0) return 0;

  let syncedCount = 0;
  const db = await openDb().catch(() => null);
  if (!db) return 0;

  for (const item of items) {
    if (item.retries >= 5) continue;
    try {
      const res = await fetch(`${apiBase}${item.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        await new Promise<void>((resolve) => {
          const tx = db.transaction(STORE_QUEUE, 'readwrite');
          tx.objectStore(STORE_QUEUE).delete(item.id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
        syncedCount++;
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        tx.objectStore(STORE_QUEUE).put({
          ...item,
          retries: item.retries + 1,
          status: item.retries + 1 >= 5 ? 'failed' : 'pending',
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  }

  db.close();
  return syncedCount;
}
