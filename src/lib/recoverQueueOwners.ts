import { offlineOwner } from "./offlineOwner";

/** Upgrade only records whose session owner has just been confirmed by the server. */
export async function recoverQueueOwners<T extends { owner?: string }>(
  db: IDBDatabase,
  storeName: string,
  rows: T[],
  sessionId: (row: T) => unknown,
  id: (row: T) => IDBValidKey
): Promise<T[]> {
  const owner = offlineOwner();
  const candidates = rows.filter((row) => !row.owner && Number.isInteger(sessionId(row)));
  if (!owner || !candidates.length || !navigator.onLine) return rows;
  try {
    const ids = [...new Set(candidates.map(sessionId))];
    for (let offset = 0; offset < ids.length; offset += 200) {
      const response = await fetch("/api/worker/offline-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Werkit-Offline-Owner": owner },
        body: JSON.stringify(ids.slice(offset, offset + 200)),
      });
      if (!response.ok) return rows;
      const body: unknown = await response.json();
      if (
        !body ||
        typeof body !== "object" ||
        !("owner" in body) ||
        body.owner !== owner ||
        !("sessionIds" in body) ||
        !Array.isArray(body.sessionIds) ||
        offlineOwner() !== owner
      )
        return rows;
      const allowed = new Set(body.sessionIds);
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      for (const row of candidates.filter((row) => allowed.has(sessionId(row)))) {
        const read = store.get(id(row));
        read.onsuccess = () => {
          if (read.result && !read.result.owner) store.put({ ...read.result, owner });
        };
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(tx.error);
      });
      for (const row of candidates) if (allowed.has(sessionId(row))) row.owner = owner;
    }
  } catch {
    /* Keep unbound records on disk for a later authenticated retry. */
  }
  return rows;
}
