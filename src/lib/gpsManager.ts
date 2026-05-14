import type { Coord } from '@/types/worker';
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";

export type GPSQueueItem = Coord & { timestamp: string };

const STORAGE_KEY = 'werkit_gps_queue';

export class GPSManager {
  static isFlushing = false;

  static getQueue(): GPSQueueItem[] {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(data)) {
        console.warn('GPS queue in localStorage is not an array. Resetting.');
        return [];
      }
      return data;
    } catch {
      return [];
    }
  }

  static saveQueue(queue: GPSQueueItem[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }

  /** Czyści kolejkę (np. po zakończonej sesji — punkty bez aktywnej sesji i tak nie zapiszą się na serwerze). */
  static clearQueue(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  static enqueue(location: Coord): GPSQueueItem {
    const payload = { ...location, timestamp: new Date().toISOString() };
    const queue = this.getQueue();
    queue.push(payload);
    this.saveQueue(queue);
    return payload;
  }

  static async flushQueue(onSuccess?: () => void): Promise<void> {
    if (!navigator.onLine || this.isFlushing) return;
    
    const queue = this.getQueue();
    if (queue.length === 0) return;

    this.isFlushing = true;
    
    // Safety check again even though getQueue guarantees an array
    if (!Array.isArray(queue)) {
      this.isFlushing = false;
      return;
    }

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
        const currentQueue = this.getQueue();
        const updatedQueue = currentQueue.filter(q => !sentTimestamps.has(q.timestamp));
        this.saveQueue(updatedQueue);
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
          const currentQueue = this.getQueue();
          const updatedQueue = currentQueue.filter((q) => !sentTimestamps.has(q.timestamp));
          this.saveQueue(updatedQueue);
        }
      }
    } catch (error) {
      console.error("GPS flush failed:", error);
    } finally {
      this.isFlushing = false;
      // Retry if queue still has items and we are online
      if (this.getQueue().length > 0 && navigator.onLine) {
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
