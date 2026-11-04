export interface CachedLogisticsEntry {
  id: string;
  siteId?: string;
  [key: string]: unknown;
}

export interface QueuedLogisticsWrite {
  requestId: string;
  userId: string;
  siteId: string;
  path?: string;
  method?: string;
  payload: Record<string, unknown>;
  files: { name: string; type: string; lastModified: number; blob: Blob }[];
  createdAt: string;
  status?: "pending" | "conflict" | "rejected";
  lastError?: string;
}

const databaseName = "securitec-offline";
const databaseVersion = 5;
const entryStore = "logistics-cache";
const userEntryStore = "user-logistics-cache";
const queueStore = "logistics-queue";
const apiCacheStore = "api-cache";
const documentCacheStore = "document-cache";

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
      if (!database.objectStoreNames.contains(userEntryStore)) {
        const store = database.createObjectStore(userEntryStore, { keyPath: "cacheKey" });
        store.createIndex("scopeKey", "scopeKey", { unique: false });
      }
      if (!database.objectStoreNames.contains(apiCacheStore)) {
        database.createObjectStore(apiCacheStore, { keyPath: "cacheKey" });
      }
      if (!database.objectStoreNames.contains(documentCacheStore)) {
        database.createObjectStore(documentCacheStore, { keyPath: "cacheKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Impossible d’ouvrir le stockage hors connexion."));
  });
}

export async function cacheApiResponse(userId: string, path: string, value: unknown): Promise<void> {
  await storeRequest(apiCacheStore, "readwrite", (store) => store.put({
    cacheKey: `${userId}:${path}`,
    value,
    updatedAt: new Date().toISOString(),
  }));
}

export async function getCachedApiResponse<T>(userId: string, path: string): Promise<T | null> {
  const cached = await storeRequest<{ value: T } | undefined>(apiCacheStore, "readonly", (store) =>
    store.get(`${userId}:${path}`),
  );
  return cached?.value ?? null;
}

export async function cacheDocumentFile(userId: string, documentId: string, blob: Blob, name: string): Promise<void> {
  await storeRequest(documentCacheStore, "readwrite", (store) => store.put({
    cacheKey: `${userId}:${documentId}`,
    blob,
    name,
    updatedAt: new Date().toISOString(),
  }));
}

export async function getCachedDocumentFile(userId: string, documentId: string): Promise<{ blob: Blob; name: string } | null> {
  const cached = await storeRequest<{ blob: Blob; name: string } | undefined>(documentCacheStore, "readonly", (store) =>
    store.get(`${userId}:${documentId}`),
  );
  return cached ? { blob: cached.blob, name: cached.name } : null;
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
  const userId = sessionStorage.getItem("securitec-session-user-id");
  if (!userId) throw new Error("Une session active est nécessaire pour mettre ces données en cache.");
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(userEntryStore, "readwrite");
      const store = transaction.objectStore(userEntryStore);
      const scopeKey = `${userId}:${siteId}`;
      const cursor = store.index("scopeKey").openCursor(IDBKeyRange.only(scopeKey));
      cursor.onsuccess = () => {
        const current = cursor.result;
        if (current) {
          store.delete(current.primaryKey);
          current.continue();
        } else {
          entries.forEach((entry) => store.put({ ...entry, userId, siteId, scopeKey, cacheKey: `${scopeKey}:${entry.id}` }));
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("Impossible d’enregistrer le cache logistique privé."));
    });
  } finally {
    database.close();
  }
}

export async function getCachedLogisticsEntries(siteId: string): Promise<CachedLogisticsEntry[]> {
  const userId = sessionStorage.getItem("securitec-session-user-id");
  if (!userId) return [];
  const scopeKey = `${userId}:${siteId}`;
  return storeRequest(userEntryStore, "readonly", (store) => store.index("scopeKey").getAll(IDBKeyRange.only(scopeKey)));
}

export async function queueLogisticsWrite(
  requestId: string,
  siteId: string,
  payload: Record<string, unknown>,
  files: File[] = [],
  path = "/logistics",
  method = "POST",
): Promise<void> {
  const userId = sessionStorage.getItem("securitec-session-user-id");
  if (!userId) throw new Error("Une session active est nécessaire pour enregistrer hors connexion.");
  const item: QueuedLogisticsWrite = {
    requestId,
    userId,
    siteId,
    path,
    method,
    payload,
    files: files.map((file) => ({ name: file.name, type: file.type, lastModified: file.lastModified, blob: file })),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  await storeRequest(queueStore, "readwrite", (store) => store.put(item));
  window.dispatchEvent(new Event("securitec-offline-queue-changed"));
}

export async function getQueuedLogisticsWrites(siteId?: string): Promise<QueuedLogisticsWrite[]> {
  const userId = sessionStorage.getItem("securitec-session-user-id");
  if (!userId) return [];
  const all = await storeRequest(queueStore, "readonly", (store) => store.getAll());
  return all.filter((entry) => entry.userId === userId && (!siteId || entry.siteId === siteId)) as QueuedLogisticsWrite[];
}

export async function updateQueuedLogisticsWrite(requestId: string, patch: Partial<QueuedLogisticsWrite>): Promise<void> {
  const item = await storeRequest<QueuedLogisticsWrite | undefined>(queueStore, "readonly", (store) => store.get(requestId));
  if (!item || item.userId !== sessionStorage.getItem("securitec-session-user-id")) return;
  await storeRequest(queueStore, "readwrite", (store) => store.put({ ...item, ...patch }));
  window.dispatchEvent(new Event("securitec-offline-queue-changed"));
}

export async function removeQueuedLogisticsWrite(requestId: string): Promise<void> {
  await storeRequest(queueStore, "readwrite", (store) => store.delete(requestId));
  window.dispatchEvent(new Event("securitec-offline-queue-changed"));
}
