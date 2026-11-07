/* Security state must survive Cache Storage failures. This database is separate
 * from all operation, part-pick and GPS queues; those stores are never touched. */
function accountStateTransaction(mode, value) {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open("werkit_offline_account", 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore("state");
    opening.onerror = () => reject(opening.error);
    opening.onblocked = () => reject(new Error("account_state_blocked"));
    opening.onsuccess = () => {
      const db = opening.result;
      const tx = db.transaction("state", mode);
      const store = tx.objectStore("state");
      const request = mode === "readonly" ? store.get("current") : store.put(value, "current");
      tx.oncomplete = () => {
        db.close();
        resolve(request.result);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error || new Error("account_state_aborted"));
      };
      tx.onerror = () => {
        /* onabort handles failed transactions */
      };
    };
  });
}

async function loadAccountState() {
  const saved = await accountStateTransaction("readonly");
  if (saved !== undefined) return saved;
  // One-time migration preserves the legacy owner and the offline-logout gate.
  // Failure to read legacy metadata never grants access to a cached account.
  let legacy = { owner: null, until: 0, blocked: true };
  try {
    const cached = await (await caches.open(PRIVATE_META)).match(META_URL);
    legacy = cached ? await cached.json() : { owner: null, until: 0, blocked: false };
  } catch {
    /* require an online login if legacy storage is unreadable */
  }
  await accountStateTransaction("readwrite", legacy);
  return legacy;
}
