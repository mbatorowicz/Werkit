"use client";

import { useCallback, useState } from "react";
import { getDictionary } from "@/i18n";
import type { MachinesCategory, MachinesResource } from "./types";

async function parseJsonList(url: string): Promise<{ rows: unknown[]; errorCode?: string }> {
  const res = await fetch(url, { cache: "no-store" });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const code =
      body !== null &&
      typeof body === "object" &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : "";
    return { rows: [], errorCode: code || "fetch_error" };
  }
  if (!Array.isArray(body)) {
    return { rows: [], errorCode: "fetch_error" };
  }
  return { rows: body };
}

function normalizeCategoryRow(row: unknown): MachinesCategory {
  const r = row as Record<string, unknown>;
  return {
    ...(row as MachinesCategory),
    isStationary: Boolean(r.isStationary),
    showCustomer: Boolean(r.showCustomer),
    showMaterial: Boolean(r.showMaterial),
    showQuantity: Boolean(r.showQuantity),
    showTaskDescription: Boolean(r.showTaskDescription),
    showResourceName: r.showResourceName !== false,
    showResourceDescription: Boolean(r.showResourceDescription),
    showRegistrationNumber: r.showRegistrationNumber !== false,
  };
}

export function useMachinesAdminData() {
  const [machines, setMachines] = useState<MachinesResource[]>([]);
  const [categories, setCategories] = useState<MachinesCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const dict = getDictionary().admin.machines;
    const apiErrors = getDictionary().apiErrors as Record<string, string>;
    try {
      const [mList, cList] = await Promise.all([parseJsonList("/api/machines"), parseJsonList("/api/categories")]);
      setMachines((Array.isArray(mList.rows) ? mList.rows : []) as MachinesResource[]);
      setCategories((Array.isArray(cList.rows) ? cList.rows : []).map(normalizeCategoryRow));

      const errCode = mList.errorCode ?? cList.errorCode;
      if (errCode) {
        alert(apiErrors[errCode] ?? dict.dbError);
      }
    } catch {
      alert(dict.dbError);
    }
    setIsLoading(false);
  }, []);

  return { machines, categories, isLoading, fetchData };
}
