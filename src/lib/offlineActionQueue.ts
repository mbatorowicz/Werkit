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

// ─── Mapowanie typ → endpoint / metoda ───────────────────────────────────────

type ActionRoute = {
  url: string;
  method: "POST" | "PUT";
};

const ACTION_ROUTES: Record<OfflineActionType, ActionRoute> = {
  end_session: { url: "/api/worker/session", method: "PUT" },
  accept_order: { url: "", method: "POST" }, // URL zależy od orderId
  cancel_session: { url: "/api/worker/session/cancel", method: "POST" },
  checkpoint: { url: "/api/worker/session/notes", method: "POST" },
  save_note: { url: "/api/worker/session/notes", method: "POST" },
  edit_note: { url: "/api/worker/session/notes", method: "PUT" },
  upload_photo: { url: "/api/worker/session/photos", method: "POST" },
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
  return `${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
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
    // Jeśli online — wykonaj od razu
    if (navigator.onLine) {
      try {
        const res = await this.executeAction(type, payload);
        if (res.ok) return { ok: true };
        // Jeśli API zwróciło błąd (nie sieciowy) — nie kolejkuj, zwróć błąd
        return { ok: false, error: `HTTP ${res.status}` };
      } catch {
        // Błąd sieci mimo navigator.onLine? Możliwy race condition.
        // Kolejkuj do IndexedDB.
        return this.enqueueOffline(type, payload, options);
      }
    }

    // Offline — zapisz do kolejki
    return this.enqueueOffline(type, payload, options);
  },

  async enqueueOffline(
    type: OfflineActionType,
    payload: OfflineActionPayload,
    options?: { maxRetries?: number }
  ): Promise<{ ok: boolean; queued: true }> {
    const action: OfflineAction = {
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

    return { ok: true, queued: true };
  },

  /**
   * Pobiera wszystkie oczekujące operacje z kolejki.
   */
  async getAll(): Promise<OfflineAction[]> {
    try {
      const db = await openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const data = req.result;
          resolve(Array.isArray(data) ? data : []);
        };
        req.onerror = () => resolve([]);
      });
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
    } catch {
      /* ignore */
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
    } catch {
      /* ignore */
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
    } catch {
      /* ignore */
    }
  },

  /**
   * Wykonuje pojedyńczą akcję (fetch).
   * Wyrzuca błąd przy problemach sieciowych.
   */
  async executeAction(type: OfflineActionType, payload: OfflineActionPayload): Promise<Response> {
    const route = ACTION_ROUTES[type];
    const url =
      type === "accept_order" ? `/api/worker/work-orders/${payload.orderId}/accept` : route.url;

    const body: Record<string, unknown> = { ...payload };
    // Usuń meta-pola które nie są częścią body API
    delete body.orderId;

    const res = await fetch(url, {
      method: route.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return res;
  },

  /**
   * Próbuje wysłać wszystkie operacje z kolejki.
   * Te które się udały — usuwa.
   * Te które przekroczyły maxRetries — usuwa z logiem błędu.
   * Te które failed sieciowo — zostawia.
   */
  async flushAll(): Promise<{ sent: number; failed: number; remaining: number }> {
    if (flushPromise) return flushPromise;
    flushPromise = this.flushPending().finally(() => {
      flushPromise = null;
    });
    return flushPromise;
  },

  async flushPending(): Promise<{ sent: number; failed: number; remaining: number }> {
    const actions = (await this.getAll()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let sent = 0;
    let failed = 0;
    for (const action of actions) {
      if (typeof action.payload.sessionId !== "number") {
        failed++;
        break;
      }
      if (action.retryCount >= action.maxRetries) {
        failed++;
        break;
      }
      try {
        const response = await this.executeAction(action.type, action.payload);
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
