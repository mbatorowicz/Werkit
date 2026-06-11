"use client";

import { useCallback, useState } from "react";
import { narrowAdminUserRows, narrowUnifiedGanttItems } from "@/lib/narrow/admin";
import { parseJsonArray } from "@/lib/parseJsonArray";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";

export function useStockMovementRefs() {
  const [workOrderOptions, setWorkOrderOptions] = useState<AdminSearchComboboxOption[]>([]);
  const [userOptions, setUserOptions] = useState<AdminSearchComboboxOption[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);

  const fetchRefs = useCallback(async () => {
    setRefsLoading(true);
    try {
      const [ordersRes, usersRes] = await Promise.all([
        fetch("/api/admin/work-orders"),
        fetch("/api/admin/users"),
      ]);
      const orders = narrowUnifiedGanttItems(await parseJsonArray(ordersRes));
      const woOpts: AdminSearchComboboxOption[] = [];
      for (const o of orders) {
        if (o._type !== "ORDER") continue;
        const labelParts: string[] = [`#${o.id}`];
        if (typeof o.resourceName === "string" && o.resourceName) labelParts.push(o.resourceName);
        const desc =
          typeof o.taskDescription === "string" && o.taskDescription.trim()
            ? o.taskDescription.trim().slice(0, 60)
            : "";
        if (desc) labelParts.push(desc);
        woOpts.push({
          id: String(o.id),
          label: labelParts.join(" · "),
          searchText: `${o.id} ${o.resourceName ?? ""} ${o.taskDescription ?? ""}`,
        });
      }
      setWorkOrderOptions(woOpts);

      const users = narrowAdminUserRows(await parseJsonArray(usersRes));
      setUserOptions(
        users
          .filter((u) => u.isActive)
          .map((u) => ({
            id: String(u.id),
            label: u.fullName,
            sublabel: u.usernameEmail,
            searchText: `${u.fullName} ${u.usernameEmail}`,
          }))
      );
    } catch {
      setWorkOrderOptions([]);
      setUserOptions([]);
    } finally {
      setRefsLoading(false);
    }
  }, []);

  return { workOrderOptions, userOptions, refsLoading, fetchRefs };
}
