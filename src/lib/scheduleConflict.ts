/** Domyślny czas trwania (h) gdy brak planu — spójnie z GanttChart. */
export const DEFAULT_SCHEDULE_DURATION_HOURS = 2;

export type ScheduleCandidateSource = "order" | "session";

export type ScheduleCandidate = {
  source: ScheduleCandidateSource;
  id: number;
  workOrderId?: number | null;
  userId: number;
  resourceId: number;
  start: Date;
  end: Date;
  workerName?: string | null;
  resourceName?: string | null;
  taskLabel?: string | null;
};

export type ScheduleConflictKind = "worker" | "resource";

export type ScheduleConflict = {
  kind: ScheduleConflictKind;
  source: ScheduleCandidateSource;
  conflictingId: number;
  conflictingOrderId?: number | null;
  start: Date;
  end: Date;
  workerName?: string | null;
  resourceName?: string | null;
  taskLabel?: string | null;
};

export type ScheduleWindowInput = {
  dueDate?: Date | null;
  expectedDurationHours?: number | string | null;
  lockedUntil?: Date | null;
  startTime?: Date | null;
  status?: string | null;
};

export type ScheduleConflictQuery = {
  userId: number;
  resourceId: number;
  dueDate: Date;
  durationHours: number;
  excludeOrderId?: number;
  excludeSessionId?: number;
};

export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export function parseDurationHours(value: number | string | null | undefined): number | null {
  if (value == null || String(value).trim() === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Koniec zarezerwowanego okna harmonogramu zlecenia. */
export function computeLockedUntil(dueDate: Date, durationHours: number): Date {
  return new Date(dueDate.getTime() + durationHours * 3600000);
}

export function computeScheduleWindow(
  input: ScheduleWindowInput
): { start: Date; end: Date } | null {
  const dueDate = input.dueDate ?? null;
  const duration = parseDurationHours(input.expectedDurationHours ?? null);
  const lockedUntil = input.lockedUntil ?? null;
  const startTime = input.startTime ?? null;

  if (dueDate && duration != null) {
    const start = dueDate;
    const end = lockedUntil ?? computeLockedUntil(dueDate, duration);
    return { start, end };
  }

  if (startTime) {
    const hours = duration ?? DEFAULT_SCHEDULE_DURATION_HOURS;
    return {
      start: startTime,
      end: new Date(startTime.getTime() + hours * 3600000),
    };
  }

  return null;
}

function buildTaskLabel(
  taskDescription?: string | null,
  categoryName?: string | null
): string | null {
  const desc = taskDescription?.trim();
  if (desc) return desc;
  const cat = categoryName?.trim();
  return cat || null;
}

export function orderRowToCandidate(row: {
  id: number;
  userId: number;
  resourceId: number;
  dueDate?: Date | null;
  expectedDurationHours?: number | string | null;
  lockedUntil?: Date | null;
  status?: string | null;
  taskDescription?: string | null;
  categoryName?: string | null;
  workerName?: string | null;
  resourceName?: string | null;
}): ScheduleCandidate | null {
  const window = computeScheduleWindow({
    dueDate: row.dueDate,
    expectedDurationHours: row.expectedDurationHours,
    lockedUntil: row.lockedUntil,
    status: row.status,
  });
  if (!window) return null;

  return {
    source: "order",
    id: row.id,
    workOrderId: row.id,
    userId: row.userId,
    resourceId: row.resourceId,
    start: window.start,
    end: window.end,
    workerName: row.workerName,
    resourceName: row.resourceName,
    taskLabel: buildTaskLabel(row.taskDescription, row.categoryName),
  };
}

export function sessionRowToCandidate(row: {
  id: number;
  workOrderId?: number | null;
  userId: number;
  resourceId: number;
  startTime?: Date | null;
  dueDate?: Date | null;
  expectedDurationHours?: number | string | null;
  status?: string | null;
  taskDescription?: string | null;
  categoryName?: string | null;
  workerName?: string | null;
  resourceName?: string | null;
}): ScheduleCandidate | null {
  const window = computeScheduleWindow({
    dueDate: row.dueDate,
    expectedDurationHours: row.expectedDurationHours,
    startTime: row.startTime,
    status: row.status,
  });
  if (!window) return null;

  return {
    source: "session",
    id: row.id,
    workOrderId: row.workOrderId,
    userId: row.userId,
    resourceId: row.resourceId,
    start: window.start,
    end: window.end,
    workerName: row.workerName,
    resourceName: row.resourceName,
    taskLabel: buildTaskLabel(row.taskDescription, row.categoryName),
  };
}

/** Sesja powiązana ze zleceniem nie duplikuje okna tego zlecenia. */
export function dedupeScheduleCandidates(candidates: ScheduleCandidate[]): ScheduleCandidate[] {
  const orderWorkOrderIds = new Set(
    candidates
      .filter((c) => c.source === "order" && c.workOrderId != null)
      .map((c) => c.workOrderId)
  );

  return candidates.filter((c) => {
    if (c.source !== "session" || c.workOrderId == null) return true;
    return !orderWorkOrderIds.has(c.workOrderId);
  });
}

export function findScheduleConflicts(
  candidates: ScheduleCandidate[],
  query: ScheduleConflictQuery
): ScheduleConflict[] {
  const startT = query.dueDate.getTime();
  const endT = startT + query.durationHours * 3600000;
  const deduped = dedupeScheduleCandidates(candidates);
  const conflicts: ScheduleConflict[] = [];

  for (const candidate of deduped) {
    if (
      query.excludeOrderId != null &&
      candidate.source === "order" &&
      candidate.id === query.excludeOrderId
    ) {
      continue;
    }
    if (
      query.excludeSessionId != null &&
      candidate.source === "session" &&
      candidate.id === query.excludeSessionId
    ) {
      continue;
    }

    const cStart = candidate.start.getTime();
    const cEnd = candidate.end.getTime();
    if (!intervalsOverlap(startT, endT, cStart, cEnd)) continue;

    const base = {
      source: candidate.source,
      conflictingId: candidate.id,
      conflictingOrderId:
        candidate.workOrderId ?? (candidate.source === "order" ? candidate.id : null),
      start: candidate.start,
      end: candidate.end,
      workerName: candidate.workerName,
      resourceName: candidate.resourceName,
      taskLabel: candidate.taskLabel,
    };

    if (candidate.userId === query.userId) {
      conflicts.push({ kind: "worker", ...base });
    }
    if (candidate.resourceId === query.resourceId) {
      conflicts.push({ kind: "resource", ...base });
    }
  }

  return conflicts;
}

/** Pierwszy komunikat PL dla legacy API (409 przy zapisie). */
export function scheduleConflictToLegacyMessage(conflicts: ScheduleConflict[]): string | null {
  const worker = conflicts.find((c) => c.kind === "worker");
  if (worker) {
    const id = worker.conflictingOrderId ?? worker.conflictingId;
    if (worker.source === "session") {
      return `Pracownik ma już w tym czasie aktywną sesję #${worker.conflictingId}.`;
    }
    return `Pracownik ma już w tym czasie przypisane zlecenie #${id}.`;
  }

  const resource = conflicts.find((c) => c.kind === "resource");
  if (resource) {
    const id = resource.conflictingOrderId ?? resource.conflictingId;
    if (resource.source === "session") {
      return `Maszyna/Pojazd jest już w tym czasie zajęty/a przez sesję #${resource.conflictingId}.`;
    }
    return `Maszyna/Pojazd jest już w tym czasie zarezerwowana w zleceniu #${id}.`;
  }

  return null;
}
