"use client";

import { useCallback, useState, type MutableRefObject } from "react";
import type { MaterialCategory, MaterialRow } from "@/features/admin/materials/types";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { narrowMaterialCategoryRows, narrowMaterialRowRows } from "@/lib/narrowApiListRows";

async function parseList(url: string): Promise<{ rows: unknown[]; errorCode?: string }> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await parseJsonUnknown(res);
    return { rows: [], errorCode: readApiErrorString(body) || "fetch_error" };
  }
  const rows = await parseJsonArray(res);
  return { rows };
}

export type MaterialsAdminAlertContext = {
  apiErrors: Record<string, string>;
  listFetchFallback: string;
};

/**
 * Wspólne ładowanie materiałów + kategorii. Kontekst alertów przez ref
 * (aktualizowany w rodzicu co render), żeby `fetchData` był stabilny.
 */
export function useMaterialsAdminData(alertCtxRef: MutableRefObject<MaterialsAdminAlertContext>) {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mList, cList] = await Promise.all([
        parseList("/api/materials"),
        parseList("/api/material-categories"),
      ]);
      setMaterials(narrowMaterialRowRows(mList.rows));
      setCategories(narrowMaterialCategoryRows(cList.rows));

      const errCode = mList.errorCode ?? cList.errorCode;
      if (errCode) {
        const { apiErrors, listFetchFallback } = alertCtxRef.current;
        alert(apiErrors[errCode] ?? listFetchFallback);
      }
    } catch {
      alert(alertCtxRef.current.listFetchFallback);
    }
    setIsLoading(false);
  }, [alertCtxRef]);

  return { materials, categories, isLoading, fetchData };
}
