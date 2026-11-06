export type PendingPartPick = {
  scope: string;
  owner: string;
  url: string;
  body: string;
  operationId: string;
};
const DB_NAME = "werkit_part_picks";
const STORE = "pending";
// Open per operation: no process-local state is required for recovery after restart.
async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "scope" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function access(
  owner: string,
  url: string,
  body?: string,
  removeId?: string
): Promise<PendingPartPick | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, body !== undefined || removeId ? "readwrite" : "readonly", {
      durability: "strict",
    });
    const store = tx.objectStore(STORE);
    const scope = JSON.stringify([owner, url]);
    let result: PendingPartPick | null = null;
    let failure: Error | null = null;
    const request = store.get(scope);
    request.onsuccess = () => {
      const saved = request.result as PendingPartPick | undefined;
      if (
        saved &&
        (saved.owner !== owner ||
          saved.url !== url ||
          typeof saved.body !== "string" ||
          typeof saved.operationId !== "string")
      ) {
        failure = new Error("part_pick_pending");
        tx.abort();
        return;
      }
      if (removeId) {
        if (saved?.operationId === removeId) store.delete(scope);
      } else if (saved) {
        if (body !== undefined && saved.body !== body) {
          failure = new Error("part_pick_pending");
          tx.abort();
          return;
        }
        result = saved;
      } else if (body !== undefined) {
        result = { scope, owner, url, body, operationId: crypto.randomUUID() };
        store.add(result);
      }
    };
    // Resolve after COMMIT, never merely after the put request succeeds.
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = () => {
      db.close();
      reject(failure ?? tx.error ?? new Error("part_pick_storage_failed"));
    };
    tx.onerror = () => {
      /* onabort settles the promise */
    };
  });
}
export const readPartPick = (owner: string, url: string) => access(owner, url);
export const preparePartPick = (owner: string, url: string, body: string) =>
  access(owner, url, body);
export const acknowledgePartPick = (owner: string, url: string, operationId: string) =>
  access(owner, url, undefined, operationId);
