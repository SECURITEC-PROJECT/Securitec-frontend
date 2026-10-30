export interface CachedLogisticsEntry {
  id: string;
  siteId?: string;
  [key: string]: unknown;
}

export interface QueuedLogisticsWrite {
  requestId: string;
  siteId: string;
  path?: string;
  payload: Record<string, unknown>;
  files: { name: string; type: string; lastModified: number; blob: Blob }[];
  createdAt: string;
}

const databaseName = "securitec-offline";
const databaseVersion = 1;
const entryStore = "logistics-cache";
const queueStore = "logistics-queue";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Le stockage hors connexion n’est pas disponible sur cet appareil."));
      return;
    }
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(entryStore)) {
        const store = database.createObjectStore(entryStore, { keyPath: "id" });
        store.createIndex("siteId", "siteId", { unique: false });
      }
      if (!database.objectStoreNames.contains(queueStore)) {
        const store = database.createObjectStore(queueStore, { keyPath: "requestId" });
        store.createIndex("siteId", "siteId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Impossible d’ouvrir le stockage hors connexion."));
  });
}

async function storeRequest<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = run(transaction.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Erreur de stockage hors connexion."));
      transaction.onabort = () => reject(transaction.error || new Error("Écriture hors connexion annulée."));
    });
  } finally {
    database.close();
  }
}

export async function cacheLogisticsEntries(siteId: string, entries: CachedLogisticsEntry[]): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(entryStore, "readwrite");
      const store = transaction.objectStore(entryStore);
      const index = store.index("siteId");
      const cursor = index.openCursor(IDBKeyRange.only(siteId));
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (current) {
          store.delete(current.primaryKey);
          current.continue();
        } else {
          entries.forEach((entry) => store.put({ ...entry, siteId }));
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Impossible d’enregistrer le cache logistique."));
    });
  } finally {
    database.close();
  }
}

export async function getCachedLogisticsEntries(siteId: string): Promise<CachedLogisticsEntry[]> {
  return storeRequest(entryStore, "readonly", (store) => store.index("siteId").getAll(IDBKeyRange.only(siteId)));
}

export async function queueLogisticsWrite(
  requestId: string,
  siteId: string,
  payload: Record<string, unknown>,
  files: File[] = [],
  path = "/logistics",
): Promise<void> {
  const item: QueuedLogisticsWrite = {
    requestId,
    siteId,
    path,
    payload,
    files: files.map((file) => ({ name: file.name, type: file.type, lastModified: file.lastModified, blob: file })),
    createdAt: new Date().toISOString(),
  };
  await storeRequest(queueStore, "readwrite", (store) => store.put(item));
}

export async function getQueuedLogisticsWrites(siteId?: string): Promise<QueuedLogisticsWrite[]> {
  const all = await storeRequest(queueStore, "readonly", (store) => store.getAll());
  return (siteId ? all.filter((entry) => entry.siteId === siteId) : all) as QueuedLogisticsWrite[];
}

export async function removeQueuedLogisticsWrite(requestId: string): Promise<void> {
  await storeRequest(queueStore, "readwrite", (store) => store.delete(requestId));
}
