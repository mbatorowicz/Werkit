import type { TimelineItem } from "@/types/worker";

function toIso(createdAt: unknown): string {
  if (createdAt instanceof Date) return createdAt.toISOString();
  if (typeof createdAt === "string") return new Date(createdAt).toISOString();
  return new Date().toISOString();
}

/**
 * Buduje posortowaną oś czasu zdjęć/notatek z payloadu SSR (`InitialWorkerData`) lub JSON `/api/worker/session`.
 */
export function buildWorkerSessionTimeline(events: unknown, notes: unknown): TimelineItem[] {
  const out: TimelineItem[] = [];

  if (Array.isArray(events)) {
    for (const raw of events) {
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Record<string, unknown>;
      const id = e.id;
      if (typeof id !== "number") continue;
      out.push({
        id: `photo_${id}`,
        type: "photo",
        content: String(e.photoUrl ?? ""),
        lat: parseFloat(String(e.latitude ?? "0")),
        lng: parseFloat(String(e.longitude ?? "0")),
        createdAt: toIso(e.createdAt),
      });
    }
  }

  if (Array.isArray(notes)) {
    for (const raw of notes) {
      if (!raw || typeof raw !== "object") continue;
      const n = raw as Record<string, unknown>;
      const id = n.id;
      if (typeof id !== "number") continue;
      const text = n.note;
      if (typeof text !== "string") continue;
      out.push({
        id: `note_${id}`,
        type: "note",
        content: text,
        lat: parseFloat(String(n.latitude ?? "0")),
        lng: parseFloat(String(n.longitude ?? "0")),
        createdAt: toIso(n.createdAt),
      });
    }
  }

  out.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return out;
}
