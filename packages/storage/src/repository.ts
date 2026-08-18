import { reqToPromise, withTransaction, type StoreName } from "./db";

/**
 * Thin, typed repository over a single IndexedDB object store.
 * Feature stores/services depend on this, never on `indexedDB` directly.
 */
export class Repository<T extends { id: string }> {
  constructor(private readonly storeName: StoreName) {}

  async get(id: string): Promise<T | undefined> {
    return withTransaction([this.storeName], "readonly", (tx) =>
      reqToPromise(tx.objectStore(this.storeName).get(id) as IDBRequest<T | undefined>),
    );
  }

  async getAll(): Promise<T[]> {
    return withTransaction([this.storeName], "readonly", (tx) =>
      reqToPromise(tx.objectStore(this.storeName).getAll() as IDBRequest<T[]>),
    );
  }

  async getAllByIndex(indexName: string, query: IDBValidKey | IDBKeyRange): Promise<T[]> {
    return withTransaction([this.storeName], "readonly", (tx) =>
      reqToPromise(
        tx.objectStore(this.storeName).index(indexName).getAll(query) as IDBRequest<T[]>,
      ),
    );
  }

  async put(entity: T): Promise<T> {
    await withTransaction([this.storeName], "readwrite", (tx) =>
      reqToPromise(tx.objectStore(this.storeName).put(entity)),
    );
    return entity;
  }

  async bulkPut(entities: T[]): Promise<void> {
    await withTransaction([this.storeName], "readwrite", async (tx) => {
      const store = tx.objectStore(this.storeName);
      for (const entity of entities) store.put(entity);
    });
  }

  async delete(id: string): Promise<void> {
    await withTransaction([this.storeName], "readwrite", (tx) =>
      reqToPromise(tx.objectStore(this.storeName).delete(id)),
    );
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await withTransaction([this.storeName], "readwrite", async (tx) => {
      const store = tx.objectStore(this.storeName);
      for (const id of ids) store.delete(id);
    });
  }

  async clear(): Promise<void> {
    await withTransaction([this.storeName], "readwrite", (tx) =>
      reqToPromise(tx.objectStore(this.storeName).clear()),
    );
  }

  async count(): Promise<number> {
    return withTransaction([this.storeName], "readonly", (tx) =>
      reqToPromise(tx.objectStore(this.storeName).count()),
    );
  }
}
