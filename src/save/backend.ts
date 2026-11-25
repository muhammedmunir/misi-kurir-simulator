import { openDB } from "@/lib/idb";

export interface SaveBackend {
  read(): Promise<unknown>;
  write(data: unknown): Promise<void>;
  clear(): Promise<void>;
}

const STORE_NAME = "saves";
const KEY = "current";

const idbBackend: SaveBackend = {
  async read() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(KEY);
      request.onsuccess = () => {
        db.close();
        resolve(request.result?.data ?? null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  },

  async write(data: unknown) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ id: KEY, data });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  },

  async clear() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  },
};

export const saveBackends: { current: SaveBackend } = { current: idbBackend };
