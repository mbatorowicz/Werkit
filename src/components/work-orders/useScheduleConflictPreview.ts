"use client";

import { useEffect, useState } from "react";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";

export type ScheduleConflictPreview = {
  kind: "worker" | "resource";
  source: "order" | "session";
  conflictingId: number;
  conflictingOrderId: number | null;
  start: string;
  end: string;
  workerName: string | null;
  resourceName: string | null;
  taskLabel: string | null;
};

type PreviewStatus = "idle" | "loading" | "clear" | "conflicts" | "error";

function parsePreviewBody(body: unknown): ScheduleConflictPreview[] {
  if (!body || typeof body !== "object" || !("conflicts" in body)) return [];
  const list = (body as { conflicts: unknown }).conflicts;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (item): item is ScheduleConflictPreview =>
      item != null &&
      typeof item === "object" &&
      typeof (item as ScheduleConflictPreview).kind === "string" &&
      typeof (item as ScheduleConflictPreview).conflictingId === "number"
  );
}

export function useScheduleConflictPreview(params: {
  scope?: "admin" | "worker";
  enabled: boolean;
  userId: string;
  resourceId: string;
  dueDate: string;
  expectedDurationHours: string;
  excludeOrderId: number | null;
}) {
  const {
    scope = "admin",
    enabled,
    userId,
    resourceId,
    dueDate,
    expectedDurationHours,
    excludeOrderId,
  } = params;
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [conflicts, setConflicts] = useState<ScheduleConflictPreview[]>([]);

  useEffect(() => {
    if (!enabled || !userId || !resourceId) {
      queueMicrotask(() => {
        setConflicts([]);
        setStatus("idle");
      });
      return;
    }

    const hasSchedule = Boolean(dueDate && expectedDurationHours.trim());
    let duration = 0;
    if (hasSchedule) {
      duration = parseFloat(expectedDurationHours);
      if (!Number.isFinite(duration) || duration <= 0) {
        queueMicrotask(() => {
          setConflicts([]);
          setStatus("idle");
        });
        return;
      }
    }

    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial status before async fetch
    setStatus("loading");

    const timer = window.setTimeout(() => {
      const qs = new URLSearchParams({
        userId,
        resourceId,
      });
      if (hasSchedule && dueDate) {
        qs.set("dueDate", new Date(dueDate).toISOString());
        qs.set("expectedDurationHours", String(duration));
      }
      if (excludeOrderId != null) {
        qs.set("excludeOrderId", String(excludeOrderId));
      }

      const basePath =
        scope === "worker"
          ? "/api/worker/work-orders/schedule-conflicts"
          : "/api/admin/work-orders/schedule-conflicts";

      void fetchWithDeviceTelemetry(
        scope === "worker"
          ? "Worker orders: schedule conflicts preview"
          : "Admin orders: schedule conflicts preview",
        `${basePath}?${qs.toString()}`,
        { cache: "no-store" },
        { category: scope === "worker" ? "orders" : "admin" }
      )
        .then(async (res) => {
          if (cancelled) return;
          if (!res.ok) {
            setStatus("error");
            setConflicts([]);
            return;
          }
          const body: unknown = await res.json();
          const next = parsePreviewBody(body);
          setConflicts(next);
          setStatus(next.length > 0 ? "conflicts" : "clear");
        })
        .catch(() => {
          if (!cancelled) {
            setStatus("error");
            setConflicts([]);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [scope, enabled, userId, resourceId, dueDate, expectedDurationHours, excludeOrderId]);

  return { status, conflicts, hasConflicts: conflicts.length > 0 };
}
