import type { Coord } from '@/types/worker';
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { sendRemoteLog } from "@/lib/remoteLogger";

export type GPSQueueItem = Coord & { timestamp: string };

const DB_NAME = 'werkit_gps_db';
const STORE_NAME = 'gps_queue';
const DB_VERSION = 1;

/**
 * Zarządza kolejką GPS w IndexedDB zamiast localStorage.
 * IndexedDB jest bardziej niezawodny na urządzeniach mobilnych:
 * - większy limit pamięci (setki MB vs ~5MB localStorage)
 * - nie jest czyszczony przez OS przy niskim stanie pamięci
 * - wspiera współbieżny dostęp
 */
export class GPSManager {
  static isFlushing = false;

  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static async openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        this.dbPromise = null;
        reject(req.error);
      };
    });
    return this.dbPromise;
  }

  static async getQueue(): Promise<GPSQueueItem[]> {
    try {
      const db = await this.openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const data = req.result;
          if (!Array.isArray(data)) {
            sendRemoteLog('WARN', 'GPSManager: queue in IndexedDB is not an array', { data }, { category: 'gps', dedupeWindowMs: 60_000 });
            resolve([]);
            return;
          }
          resolve(data);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      sendRemoteLog('WARN', 'GPSManager: failed to read queue from IndexedDB, falling back to empty', {}, { category: 'gps', dedupeWindowMs: 60_000 });
      return [];
    }
  }

  private static async saveQueue(queue: GPSQueueItem[]): Promise<void> {
    try {
      const db = await this.openDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const item of queue) {
        store.add(item);
      }
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      sendRemoteLog('ERROR', 'GPSManager: failed to save queue to IndexedDB', {}, { category: 'gps', dedupeWindowMs: 60_000 });
    }
  }

  /** Czyści kolejkę (np. po zakończonej sesji — punkty bez aktywnej sesji i tak nie zapiszą się na serwerze). */
  static async clearQueue(): Promise<void> {
    try {
      const db = await this.openDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    } catch {
      /* ignore */
    }
  }

  static async enqueue(location: Coord): Promise<GPSQueueItem> {
    const payload: GPSQueueItem = { ...location, timestamp: new Date().toISOString() };
    try {
      const db = await this.openDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).add(payload);
    } catch {
      sendRemoteLog('ERROR', 'GPSManager: failed to enqueue location', { lat: location.lat, lng: location.lng }, { category: 'gps', dedupeWindowMs: 60_000 });
    }
    return payload;
  }

  static async flushQueue(onSuccess?: () => void): Promise<void> {
    if (!navigator.onLine || this.isFlushing) return;
    
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    this.isFlushing = true;

    const sentTimestamps = new Set(queue.map(q => q.timestamp));

    try {
      const res = await fetchWithDeviceTelemetry(
        "Worker: GPS batch POST",
        "/api/worker/gps",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queue),
          keepalive: true,
        },
        { category: "gps", throttleKey: "gps_batch_post", throttleMs: 60_000 },
      );

      if (res.ok) {
        const currentQueue = await this.getQueue();
        const updatedQueue = currentQueue.filter(q => !sentTimestamps.has(q.timestamp));
        await this.saveQueue(updatedQueue);
        if (onSuccess) onSuccess();
      } else if (res.status === 400) {
        let code: string | undefined;
        try {
          const j = (await res.clone().json()) as { error?: string };
          code = typeof j.error === "string" ? j.error : undefined;
        } catch {
          /* nie-JSON */
        }
        if (code === "no_active_session") {
          const currentQueue = await this.getQueue();
          const updatedQueue = currentQueue.filter((q) => !sentTimestamps.has(q.timestamp));
          await this.saveQueue(updatedQueue);
        }
      }
    } catch (error) {
      sendRemoteLog(
        'ERROR',
        'GPSManager: flush failed',
        { error: error instanceof Error ? { name: error.name, message: error.message } : { raw: String(error) } },
        { category: 'gps', dedupeWindowMs: 60_000 },
      );
    } finally {
      this.isFlushing = false;
      // Retry if queue still has items and we are online
      const remaining = await this.getQueue();
      if (remaining.length > 0 && navigator.onLine) {
        setTimeout(() => this.flushQueue(onSuccess), 100);
      }
    }
  }

  static getDistance(a: Coord, b: Coord): number {
    const R = 6371e3;
    const φ1 = a.lat * Math.PI / 180;
    const φ2 = b.lat * Math.PI / 180;
    const Δφ = (b.lat - a.lat) * Math.PI / 180;
    const Δλ = (b.lng - a.lng) * Math.PI / 180;

    const x = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }
}
