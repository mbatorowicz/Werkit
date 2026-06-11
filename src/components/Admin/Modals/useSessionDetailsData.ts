"use client";

import { useEffect, useState } from "react";
import type { TimelineItem } from "@/types/worker";
import type { UnifiedGanttItem } from "@/types/admin";
import { displayPathFromRawGpsRows } from "@/lib/gps";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";

type SessionLogRow = { latitude?: unknown; longitude?: unknown; timestamp?: unknown };

type SessionPhotoRow = {
  id?: number;
  latitude?: string | null;
  longitude?: string | null;
  photoUrl?: string;
  photoType?: string;
  createdAt?: string;
};

type SessionNoteRow = {
  id?: number;
  latitude?: string | null;
  longitude?: string | null;
  note?: string;
  createdAt?: string;
};

export function useSessionDetailsData(item: UnifiedGanttItem) {
  const [logs, setLogs] = useState<SessionLogRow[]>([]);
  const [photos, setPhotos] = useState<SessionPhotoRow[]>([]);
  const [notes, setNotes] = useState<SessionNoteRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item._type !== "SESSION") return;
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const r = await fetchWithDeviceTelemetry(
          `Admin: work-session ${item.id}`,
          `/api/admin/work-sessions/${item.id}`,
          undefined,
          { category: "admin" }
        );
        if (!r.ok) return;
        const data = (await r.json()) as {
          logs?: SessionLogRow[];
          photos?: SessionPhotoRow[];
          notes?: SessionNoteRow[];
        };
        if (cancelled) return;
        if (data.logs) setLogs(data.logs);
        if (data.photos) setPhotos(data.photos);
        if (data.notes) setNotes(data.notes);
      } catch {
        /* sieć */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    queueMicrotask(() => void run());
    return () => {
      cancelled = true;
    };
  }, [item]);

  const pathTraveled = displayPathFromRawGpsRows(logs, { reverseToChronological: true });
  const events: TimelineItem[] = [
    ...photos
      .filter((p): p is typeof p & { latitude: string; longitude: string } =>
        Boolean(p.latitude && p.longitude)
      )
      .map((p) => ({
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
        id: `photo_${p.id ?? ""}`,
        content: p.photoUrl ?? "",
        type: "photo" as const,
        createdAt: p.createdAt ?? "",
      })),
    ...notes
      .filter((n): n is typeof n & { latitude: string; longitude: string; note: string } =>
        Boolean(n.latitude && n.longitude && n.note)
      )
      .map((n) => ({
        lat: parseFloat(n.latitude),
        lng: parseFloat(n.longitude),
        id: `note_${n.id ?? ""}`,
        content: n.note,
        type: "note" as const,
        createdAt: n.createdAt ?? "",
      })),
  ];
  const hasMapData = logs.length > 0 || events.length > 0;
  const currentLocation =
    logs.length > 0
      ? pathTraveled[pathTraveled.length - 1]
      : events.length > 0
        ? events[events.length - 1]
        : { lat: 52.2297, lng: 21.0122 };

  const timelineItems = [
    ...photos.map((p) => ({
      ...p,
      type: "photo" as const,
      time: new Date(p.createdAt ?? 0).getTime(),
    })),
    ...notes.map((n) => ({
      ...n,
      type: "note" as const,
      time: new Date(n.createdAt ?? 0).getTime(),
    })),
  ].sort((a, b) => b.time - a.time);
  const allPhotos = timelineItems
    .filter(
      (entry): entry is typeof entry & { photoUrl: string } =>
        entry.type === "photo" && typeof entry.photoUrl === "string"
    )
    .map((p) => p.photoUrl);

  return {
    isLoading,
    pathTraveled,
    events,
    hasMapData,
    currentLocation,
    timelineItems,
    allPhotos,
  };
}
