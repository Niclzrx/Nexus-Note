/**
 * Low-level IndexedDB wiring for Nexus Note.
 *
 * This is the ONLY file in the app that is allowed to talk to `indexedDB`
 * directly. Everything above it (stores, features, UI) goes through
 * `StorageService` in `storage-service.ts`. That's what lets us swap the
 * persistence backend later (see roadmap §53/§8 "trocar sistema de
 * armazenamento sem reescrever a interface") without touching UI code.
 */

export const DB_NAME = "nexus-note-db";
export const DB_VERSION = 1;

export const STORE = {
  workspaces: "workspaces",
  boards: "boards",
  elements: "elements",
  connections: "connections",
  groups: "groups",
  assets: "assets",
  assetBlobs: "assetBlobs",
  trash: "trash",
  history: "history",
  settings: "settings",
} as const;

export type StoreName = (typeof STORE)[keyof typeof STORE];

/**
 * Schema migrations. Each function runs when upgrading FROM (key) TO (key+1).
 * Add a new entry here whenever DB_VERSION is bumped — never mutate an
 * existing entry once it has shipped.
 */
const migrations: Record<number, (db: IDBDatabase) => void> = {
  1: (db) => {
    const workspaces = db.createObjectStore(STORE.workspaces, { keyPath: "id" });
    workspaces.createIndex("byIsDefault", "isDefault");

    const boards = db.createObjectStore(STORE.boards, { keyPath: "id" });
    boards.createIndex("byWorkspace", "workspaceId");
    boards.createIndex("byTrashed", "isTrashed");
    boards.createIndex("byFavorite", "isFavorite");
    boards.createIndex("byLastOpened", "lastOpenedAt");

    const elements = db.createObjectStore(STORE.elements, { keyPath: "id" });
    elements.createIndex("byBoard", "boardId");
    elements.createIndex("byBoardType", ["boardId", "type"]);
    elements.createIndex("byGroup", "groupId");

    const connections = db.createObjectStore(STORE.connections, { keyPath: "id" });
    connections.createIndex("byBoard", "boardId");
    connections.createIndex("bySource", "sourceId");
    connections.createIndex("byTarget", "targetId");

    const groups = db.createObjectStore(STORE.groups, { keyPath: "id" });
    groups.createIndex("byBoard", "boardId");

    const assets = db.createObjectStore(STORE.assets, { keyPath: "id" });
    assets.createIndex("byKind", "kind");

    db.createObjectStore(STORE.assetBlobs, { keyPath: "id" });

    const trash = db.createObjectStore(STORE.trash, { keyPath: "id" });
    trash.createIndex("byBoard", "boardId");
    trash.createIndex("byTrashedAt", "trashedAt");

    const history = db.createObjectStore(STORE.history, { keyPath: "id" });
    history.createIndex("byBoard", "boardId");
    history.createIndex("byTimestamp", "timestamp");

    db.createObjectStore(STORE.settings, { keyPath: "id" });
  },
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const fromVersion = event.oldVersion || 0;
      for (let v = fromVersion + 1; v <= DB_VERSION; v += 1) {
        migrations[v]?.(db);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another open tab."));
  });

  return dbPromise;
}

/** Wraps an IDBRequest in a Promise. */
export function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

/** Runs `fn` inside a transaction against one or more stores and awaits completion. */
export async function withTransaction<T>(
  storeNames: StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(storeNames, mode);
  const result = await fn(tx);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}
