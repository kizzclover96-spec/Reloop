const DB_NAME = "reloop-local";
const DB_VERSION = 1;
const STORE_VIEWS = "recentlyViewed";
const STORE_PREFS = "preferences";
const MAX_RECENT = 50;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_VIEWS)) {
        db.createObjectStore(STORE_VIEWS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PREFS)) {
        db.createObjectStore(STORE_PREFS, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface RecentlyViewedEntry {
  id: string;
  brand: string;
  title: string;
  image: string;
  price: number;
  viewedAt: number;
}

/** Logs a product view locally only — never sent to Firestore, nobody else can see it. */
export async function logRecentlyViewed(item: Omit<RecentlyViewedEntry, "viewedAt">) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_VIEWS, "readwrite");
    tx.objectStore(STORE_VIEWS).put({ ...item, viewedAt: Date.now() });
    await txDone(tx);
    await trimRecentlyViewed();
  } catch (err) {
    console.warn("Local activity log failed", err);
  }
}

async function trimRecentlyViewed() {
  const db = await openDB();
  const tx = db.transaction(STORE_VIEWS, "readwrite");
  const store = tx.objectStore(STORE_VIEWS);
  const all = await requestToPromise(store.getAll() as IDBRequest<RecentlyViewedEntry[]>);
  if (all.length > MAX_RECENT) {
    all.sort((a, b) => a.viewedAt - b.viewedAt);
    all.slice(0, all.length - MAX_RECENT).forEach((entry) => store.delete(entry.id));
  }
  await txDone(tx);
}

export async function getRecentlyViewed(): Promise<RecentlyViewedEntry[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_VIEWS, "readonly");
    const all = await requestToPromise(tx.objectStore(STORE_VIEWS).getAll() as IDBRequest<RecentlyViewedEntry[]>);
    return all.sort((a, b) => b.viewedAt - a.viewedAt);
  } catch {
    return [];
  }
}

export async function setPreference(key: string, value: unknown) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PREFS, "readwrite");
    tx.objectStore(STORE_PREFS).put({ key, value });
    await txDone(tx);
  } catch (err) {
    console.warn("Local preference save failed", err);
  }
}

export async function getPreference<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PREFS, "readonly");
    const result = await requestToPromise(
      tx.objectStore(STORE_PREFS).get(key) as IDBRequest<{ key: string; value: T } | undefined>
    );
    return result ? result.value : fallback;
  } catch {
    return fallback;
  }
}

/** Everything stored locally, bundled up for the "download my data" button. */
export async function exportLocalData() {
  const [recentlyViewed, searchRadiusKm] = await Promise.all([
    getRecentlyViewed(),
    getPreference("searchRadiusKm", 5),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    recentlyViewed,
    preferences: { searchRadiusKm },
  };
}

/** Wipes everything in the local store — for the "delete my data" button. */
export async function clearLocalData() {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_VIEWS, STORE_PREFS], "readwrite");
    tx.objectStore(STORE_VIEWS).clear();
    tx.objectStore(STORE_PREFS).clear();
    await txDone(tx);
  } catch (err) {
    console.warn("Local data clear failed", err);
  }
}
