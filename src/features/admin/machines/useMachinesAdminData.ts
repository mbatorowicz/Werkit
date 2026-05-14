"use client";

import { useCallback, useState } from "react";
import { getDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { narrowMachinesCategoryRows, narrowMachinesResourceRows } from "@/lib/narrowApiListRows";
import type { MachinesCategory, MachinesResource } from "./types";

async function parseJsonList(url: string): Promise<{ rows: unknown[]; errorCode?: string }> {
  const res = await fetchWithDeviceTelemetry(`Admin machines: GET ${url}`, url, { cache: "no-store" }, {
    category: "admin",
  });
  if (!res.ok) {
    const body = await parseJsonUnknown(res);
    return { rows: [], errorCode: readApiErrorString(body) || "fetch_error" };
  }
  const rows = await parseJsonArray(res);
  return { rows };
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
      setMachines(narrowMachinesResourceRows(mList.rows));
      setCategories(narrowMachinesCategoryRows(cList.rows));

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
