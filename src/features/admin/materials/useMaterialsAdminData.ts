"use client";

import { useCallback, useState, type MutableRefObject } from "react";
import type { MaterialCategory, MaterialRow } from "@/features/admin/materials/types";

async function parseList(url: string): Promise<{ rows: unknown[]; errorCode?: string }> {
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
      setMaterials((Array.isArray(mList.rows) ? mList.rows : []) as MaterialRow[]);
      setCategories((Array.isArray(cList.rows) ? cList.rows : []) as MaterialCategory[]);

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
