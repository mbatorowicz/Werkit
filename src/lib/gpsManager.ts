import { sendRemoteLog } from "@/lib/remoteLogger";
import type { Coord } from "@/types/worker";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { GPS_MAX_POINTS_PER_REQUEST } from "@/lib/gpsPayloadLimits";

export type GPSQueueItem = Coord & { pointId: string; sessionId: number; timestamp: string };
const STORE = "gps_queue_v2";
const META = "stopped_sessions";
export const GPS_STOP_EVENT = "werkit-gps-stop";

/** Durable queue. Browser storage can still be removed by the user/OS. */
export class GPSManager {
  static isFlushing = false;
  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("werkit_gps_db", 2);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE))
          req.result.createObjectStore(STORE, { keyPath: "pointId" });
        if (!req.result.objectStoreNames.contains(META)) req.result.createObjectStore(META);
        // Keep legacy unbound points untouched; never assign them to a new session.
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        this.dbPromise = null;
        reject(req.error);
      };
    });
    return this.dbPromise;
  }
  private static committed(tx: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error ?? new Error("gps_storage_failed"));
    });
  }
  static async getQueue(): Promise<GPSQueueItem[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  static async getLegacyQueue(): Promise<unknown[]> {
    const db = await this.openDb();
    if (!db.objectStoreNames.contains("gps_queue")) return [];
    return new Promise((resolve, reject) => {
      const req = db.transaction("gps_queue", "readonly").objectStore("gps_queue").getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  static async isStopped(sessionId: number): Promise<boolean> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(META, "readonly").objectStore(META).get(sessionId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => reject(req.error);
    });
  }
  static async stopSession(sessionId: number): Promise<void> {
    const db = await this.openDb();
    const tx = db.transaction(META, "readwrite");
    tx.objectStore(META).put(true, sessionId);
    await this.committed(tx);
    window.dispatchEvent(new CustomEvent(GPS_STOP_EVENT, { detail: sessionId }));
    // Wake other tabs; persistent truth is IndexedDB, not localStorage.
    try {
      localStorage.setItem(GPS_STOP_EVENT, `${sessionId}:${Date.now()}`);
    } catch {
      /* IndexedDB marker remains */
    }
  }
  static async enqueue(
    location: Coord,
    sessionId: number,
    timestamp = new Date().toISOString()
  ): Promise<GPSQueueItem | null> {
    if (!Number.isInteger(sessionId) || sessionId < 1) throw new Error("gps_session_required");
    const payload = { ...location, sessionId, pointId: crypto.randomUUID(), timestamp };
    const db = await this.openDb();
    const tx = db.transaction([STORE, META], "readwrite");
    let accepted = false;
    const check = tx.objectStore(META).get(sessionId);
    check.onsuccess = () => {
      if (!check.result) {
        tx.objectStore(STORE).add(payload);
        accepted = true;
      }
    };
    await this.committed(tx);
    return accepted ? payload : null;
  }
  static async acknowledge(ids: string[]): Promise<void> {
    const db = await this.openDb();
    const tx = db.transaction(STORE, "readwrite");
    for (const id of ids) tx.objectStore(STORE).delete(id);
    await this.committed(tx);
  }
  /** Explicit maintenance only. Never invoked on logout/end/HTTP errors. */
  static async clearQueue(): Promise<void> {
    const db = await this.openDb();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    await this.committed(tx);
  }
  static async flushQueue(onSuccess?: () => void): Promise<void> {
    if (!navigator.onLine || this.isFlushing) return;
    this.isFlushing = true;
    try {
      const queue = (await this.getQueue()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      for (const sessionId of new Set(queue.map((p) => p.sessionId))) {
        const group = queue.filter((p) => p.sessionId === sessionId);
        for (let offset = 0; offset < group.length; offset += GPS_MAX_POINTS_PER_REQUEST) {
          const batch = group.slice(offset, offset + GPS_MAX_POINTS_PER_REQUEST);
          const res = await fetchWithDeviceTelemetry(
            "Worker: GPS batch POST",
            "/api/worker/gps",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(batch),
              keepalive: true,
            },
            { category: "gps", throttleKey: "gps_batch_post", throttleMs: 60_000 }
          );
          if (!res.ok) break; // retain every unacknowledged point; no hot retry loop
          const body: unknown = await res.json();
          if (
            !body ||
            typeof body !== "object" ||
            !("acknowledgedIds" in body) ||
            !Array.isArray(body.acknowledgedIds)
          )
            break;
          const sent = new Set(batch.map((p) => p.pointId));
          const ids = body.acknowledgedIds.filter(
            (id): id is string => typeof id === "string" && sent.has(id)
          );
          await this.acknowledge(ids);
          // A rejected sample must not starve later batches of the same session.
          if (ids.length) onSuccess?.();
        }
      }
    } catch {
      sendRemoteLog(
        "WARN",
        "GPS sync deferred; points retained",
        {},
        { category: "gps", dedupeWindowMs: 60000 }
      );
    } finally {
      this.isFlushing = false;
    }
  }

  static getDistance(a: Coord, b: Coord): number {
    const R = 6371e3;
    const φ1 = (a.lat * Math.PI) / 180;
    const φ2 = (b.lat * Math.PI) / 180;
    const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
    const Δλ = ((b.lng - a.lng) * Math.PI) / 180;

    const x =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    return R * c;
  }
}
