"use client";

import { useCallback, useState } from "react";

export type ResourceGroupOption = {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  resourceCount?: number;
};

/**
 * Grupy maszyn (typy zasobów) z `/api/resource-groups` — nie kategorie zleceń.
 */
export function useResourceGroups() {
  const [groups, setGroups] = useState<ResourceGroupOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/resource-groups");
      if (!res.ok) {
        console.warn("Failed to fetch resource groups");
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data)) {
        setGroups([]);
        return;
      }
      const parsed: ResourceGroupOption[] = [];
      for (const raw of data) {
        if (typeof raw !== "object" || raw === null) continue;
        const r = raw as Record<string, unknown>;
        if (typeof r.id !== "number" || typeof r.name !== "string") continue;
        parsed.push({
          id: r.id,
          name: r.name,
          description: typeof r.description === "string" ? r.description : null,
          sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : 0,
          resourceCount: typeof r.resourceCount === "number" ? r.resourceCount : undefined,
        });
      }
      setGroups(parsed);
    } catch {
      console.warn("Error fetching resource groups");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { groups, isLoading, fetchGroups };
}
