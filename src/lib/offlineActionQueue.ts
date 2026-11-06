/**
 * Offline Action Queue — kolejka operacji pracownika w IndexedDB.
 *
 * Gdy brak internetu, akcje (start/end session, checkpoint, notes, photos)
 * są zapisywane do IndexedDB i automatycznie wysyłane po powrocie online.
 *
 * Wzór: GPSManager (src/lib/gpsManager.ts) — ale dla wszystkich akcji worker.
 *
 * Użycie:
 *   import { offlineActionQueue } from "@/lib/offlineActionQueue";
 *   await offlineActionQueue.enqueue("end_session", { latitude, longitude });
 *
 * Auto-flush: po powrocie online wywołaj offlineActionQueue.flushAll().
 * Można podpiąć pod window.addEventListener("online", ...).
 */

import { sendRemoteLog } from "@/lib/remoteLogger";
import { offlineOwner, requireOfflineOwner } from "./offlineOwner";
import { recoverQueueOwners } from "./recoverQueueOwners";

// ─── Typy operacji ───────────────────────────────────────────────────────────

export type OfflineActionType =
  | "end_session"
  | "accept_order"
  | "cancel_session"
  | "checkpoint"
  | "save_note"
  | "edit_note"
  | "upload_photo";

export type OfflineActionPayload = Record<string, unknown>;

export type OfflineAction = {
  owner?: string;
  protocolVersion?: 2;
  /** UUID — klucz główny w IndexedDB */
  id: string;
  /** Typ operacji */
  type: OfflineActionType;
  /** Ciało requestu (body JSON) */
  payload: OfflineActionPayload;
  /** ISO timestamp utworzenia */
  createdAt: string;
  /** Liczba prób wysyłki (dla retry) */
  retryCount: number;
  /** Maksymalna liczba prób */
  maxRetries: number;
};

// ─── IndexedDB ───────────────────────────────────────────────────────────────

const DB_NAME = "werkit_offline_queue";
const STORE_NAME = "actions";
const DB_VERSION = 1;

let flushPromise: Promise<{ sent: number; failed: number; remaining: number }> | null = null;

let dbPromise: Promise<IDBDatabase> | null = null;

async function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

// ─── Kolejka ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

export const offlineActionQueue = {
  /**
   * Dodaje operację do kolejki offline.
   * Jeśli jesteśmy online — wykonuje od razu (flush).
   * Jeśli offline — zapisuje do IndexedDB.
   *
   * Zwraca: { ok: true } jeśli wykonano online,
   *         { ok: true, queued: true } jeśli zapisano do kolejki,
   *         { ok: false, error: string } jeśli błąd.
   */
  async enqueue(
    type: OfflineActionType,
    payload: OfflineActionPayload,
    options?: { maxRetries?: number }
  ): Promise<{ ok: boolean; queued?: boolean; error?: string }> {
    payload = { ...payload, occurredAt: new Date().toISOString() };
    const saved = await this.enqueueOffline(type, payload, options);
    if (navigator.onLine) await this.flushAll();
    const pending = (await this.getAll()).find((action) => action.id === saved.id);
    return pending ? { ok: true, queued: true } : { ok: true };
  },

  async enqueueOffline(
    type: OfflineActionType,
    payload: OfflineActionPayload,
    options?: { maxRetries?: number }
  ): Promise<{ ok: boolean; queued: true; id: string }> {
    const action: OfflineAction = {
      owner: requireOfflineOwner(),
      protocolVersion: 2,
      id: generateId(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 5,
    };

    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).add(action);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      sendRemoteLog(
        "INFO",
        `OfflineQueue: enqueued ${type}`,
        {
          actionId: action.id,
          type,
        },
        { category: "session", dedupeWindowMs: 10_000 }
      );
    } catch (err) {
      sendRemoteLog(
        "ERROR",
        "OfflineQueue: failed to enqueue",
        {
          error: err instanceof Error ? err.message : String(err),
          type,
        },
        { category: "session" }
      );
      throw err;
    }

    if (
      (type === "end_session" || type === "cancel_session") &&
      typeof payload.sessionId === "number"
    ) {
      const { GPSManager } = await import("@/lib/gpsManager");
      await GPSManager.stopSession(payload.sessionId);
    }
    return { ok: true, queued: true, id: action.id };
  },

  /**
   * Pobiera wszystkie oczekujące operacje z kolejki.
   */
  async getAll(): Promise<OfflineAction[]> {
    try {
      const db = await openDb();
      const rows = await new Promise<OfflineAction[]>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const data = req.result;
          resolve(Array.isArray(data) ? data : []);
        };
        req.onerror = () => resolve([]);
      });
      await recoverQueueOwners(
        db,
        STORE_NAME,
        rows,
        (row) => row.payload?.sessionId,
        (row) => row.id
      );
      return rows.filter((row) => row.owner && row.owner === offlineOwner());
    } catch {
      return [];
    }
  },

  /**
   * Zwraca liczbę oczekujących operacji.
   */
  async getCount(): Promise<number> {
    const all = await this.getAll();
    return all.length;
  },

  /**
   * Usuwa operację z kolejki (po udanej wysyłce).
   */
  async remove(id: string): Promise<void> {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Aktualizuje retryCount operacji.
   */
  async updateRetry(id: string, retryCount: number): Promise<void> {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const action = req.result;
        if (action) {
          action.retryCount = retryCount;
          store.put(action);
        }
      };
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Czyści całą kolejkę (np. po zakończeniu sesji).
   */
  async clear(): Promise<void> {
    try {
      const db = await openDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Wykonuje pojedyńczą akcję (fetch).
   * Wyrzuca błąd przy problemach sieciowych.
   */
  async executeAction(
    type: OfflineActionType,
    payload: OfflineActionPayload,
    operationId?: string
  ): Promise<Response> {
    const res = await fetch("/api/worker/offline", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Werkit-Offline-Owner": requireOfflineOwner(),
      },
      body: JSON.stringify({ operationId, type, payload }),
    });

    return res;
  },

  /**
   * Próbuje wysłać wszystkie operacje z kolejki.
   * Te które się udały — usuwa.
   * Konflikty pozostają do decyzji użytkownika; następne operacje czekają.
   * Te które failed sieciowo — zostawia.
   */
  async flushAll(): Promise<{ sent: number; failed: number; remaining: number }> {
    if (flushPromise) return flushPromise;
    const run = () => this.flushPending();
    flushPromise = (async () =>
      await (typeof navigator !== "undefined" && navigator.locks
        ? navigator.locks.request("werkit-offline-flush", run)
        : run()))().finally(() => {
      flushPromise = null;
    });
    return flushPromise;
  },

  async flushPending(): Promise<{ sent: number; failed: number; remaining: number }> {
    const actions = (await this.getAll()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let sent = 0;
    let failed = 0;
    for (const action of actions) {
      if (!action.owner || action.owner !== offlineOwner()) continue;
      if (action.protocolVersion !== 2 || typeof action.payload.sessionId !== "number") {
        failed++;
        break;
      }
      if (action.retryCount >= action.maxRetries) {
        failed++;
        break;
      }
      try {
        const response = await this.executeAction(action.type, action.payload, action.id);
        if (!response.ok) {
          await this.updateRetry(
            action.id,
            response.status >= 400 && response.status < 500
              ? action.maxRetries
              : action.retryCount + 1
          );
          failed++;
          break;
        }
        await this.remove(action.id);
        sent++;
      } catch {
        failed++;
        break;
      }
    }
    return { sent, failed, remaining: await this.getCount() };
  },
};
