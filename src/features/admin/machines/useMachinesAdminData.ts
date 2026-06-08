"use client";

import { useCallback, useState } from "react";
import { useDictionary } from "@/i18n";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { narrowMachinesCategoryRows, narrowMachinesResourceRows } from "@/lib/narrowApiListRows";
import type { MachinesCategory, MachinesResource } from "./types";

async function parseJsonList(url: string): Promise<{ rows: unknown[]; errorCode?: string }> {
  const res = await fetchWithDeviceTelemetry(
    `Admin machines: GET ${url}`,
    url,
    { cache: "no-store" },
    {
      category: "admin",
    }
  );
  if (!res.ok) {
    const body = await parseJsonUnknown(res);
    return { rows: [], errorCode: readApiErrorString(body) || "fetch_error" };
  }
  const rows = await parseJsonArray(res);
  return { rows };
}

export function useMachinesAdminData() {
  const { alert: appAlert } = useAppDialog();
  const dictionary = useDictionary();
  const dictMachines = dictionary.admin.machines;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const [machines, setMachines] = useState<MachinesResource[]>([]);
  const [categories, setCategories] = useState<MachinesCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const dict = dictMachines;
    try {
      const [mList, cList] = await Promise.all([
        parseJsonList("/api/machines"),
        parseJsonList("/api/categories"),
      ]);
      setMachines(narrowMachinesResourceRows(mList.rows));
      setCategories(narrowMachinesCategoryRows(cList.rows));

      const errCode = mList.errorCode ?? cList.errorCode;
      if (errCode) {
        await appAlert({ message: appDialogApiMessage(apiErrors, errCode, dict.dbError) });
      }
    } catch {
      await appAlert({ message: dict.dbError });
    }
    setIsLoading(false);
  }, [appAlert, apiErrors, dictMachines]);

  return { machines, categories, isLoading, fetchData };
}
