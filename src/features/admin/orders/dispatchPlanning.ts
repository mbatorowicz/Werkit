import type { UnifiedGanttItem } from "@/types/admin";
import { snapDatetimeLocalValue } from "@/lib/datetimeLocal";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";

export function formatDueDatetimeLocal(dateString: string | null): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  const offset = d.getTimezoneOffset() * 60000;
  const raw = new Date(d.getTime() - offset).toISOString().slice(0, 16);
  return snapDatetimeLocalValue(raw);
}

/** Lista scalona pod Gantt i tabelę dyspozycji — kolejność i filtrowanie w jednym miejscu (SRP). */
export function buildUnifiedDispatchItems(
  orders: UnifiedGanttItem[],
  sessions: UnifiedGanttItem[],
  searchQuery: string
): UnifiedGanttItem[] {
  const q = searchQuery.trim();
  return [
    ...orders.map((o) => ({
      ...o,
      _type: "ORDER" as const,
      _sortDate: o.createdAt ? new Date(o.createdAt as string).getTime() : 0,
      _statusGroup: o.status === "PENDING" ? 1 : 2,
    })),
    ...sessions.map((s) => ({
      ...s,
      _type: "SESSION" as const,
      _sortDate: s.startTime ? new Date(s.startTime as string).getTime() : 0,
      _statusGroup: s.status === "IN_PROGRESS" ? 1 : 2,
    })),
  ]
    .filter((item) => {
      if (!q) return true;
      return (
        matchesSearchQuery((item.workerName as string) ?? "", q) ||
        matchesSearchQuery((item.resourceName as string) ?? "", q)
      );
    })
    .sort((a, b) => {
      const groupDiff = (a._statusGroup as number) - (b._statusGroup as number);
      if (groupDiff !== 0) return groupDiff;
      return (b._sortDate as number) - (a._sortDate as number);
    });
}
