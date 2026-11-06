import "fake-indexeddb/auto";
import { afterEach, expect, it, vi } from "vitest";
import { recoverQueueOwners } from "./recoverQueueOwners";
afterEach(() => vi.unstubAllGlobals());
it("binds only server-confirmed legacy sessions and preserves unconfirmed records", async () => {
  vi.stubGlobal("document", { querySelector: () => ({ content: "1:1" }) });
  vi.stubGlobal("navigator", { onLine: true });
  const rows: { id: string; sessionId: number; owner?: string }[] = [
    { id: "a", sessionId: 1 },
    { id: "b", sessionId: 2 },
  ];
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("recover-test", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("queue", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction("queue", "readwrite");
  rows.forEach((row) => tx.objectStore("queue").put(row));
  await new Promise<void>((resolve) => {
    tx.oncomplete = () => resolve();
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ owner: "1:1", sessionIds: [1] })))
  );
  await recoverQueueOwners(
    db,
    "queue",
    rows,
    (row) => row.sessionId,
    (row) => row.id
  );
  expect(rows).toEqual([
    { id: "a", sessionId: 1, owner: "1:1" },
    { id: "b", sessionId: 2 },
  ]);
  const saved = await new Promise<unknown[]>((resolve) => {
    const request = db.transaction("queue", "readonly").objectStore("queue").getAll();
    request.onsuccess = () => resolve(request.result);
  });
  expect(saved).toEqual(rows);
  db.close();
});
