"use client";

import { useCallback, useRef, useState } from "react";
import type { SparePart, SparePartCategory } from "@/types/dur";
import { narrowSpareParts, narrowSparePartCategories } from "@/lib/narrow/dur";

export interface SparePartsAdminAlertContext {
  apiErrors: Record<string, string>;
  listFetchFallback: string;
}

export function useSparePartsAdminData(alertCtxRef: React.MutableRefObject<SparePartsAdminAlertContext>) {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [categories, setCategories] = useState<SparePartCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [machineCategories, setMachineCategories] = useState<SparePartCategory[]>([]);
  const fetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    setIsLoading(true);
    try {
      const [partsRes, catRes, machineCatRes] = await Promise.all([
        fetch("/api/dur/spare-parts"),
        fetch("/api/dur/spare-part-categories?leavesOnly=1"),
        fetch("/api/dur/spare-part-categories"),
      ]);

      if (id !== fetchRef.current) return;

      const partsData = narrowSpareParts(await partsRes.json());
      const catData = narrowSparePartCategories(await catRes.json());
      const machineCatData = narrowSparePartCategories(await machineCatRes.json());

      setParts(partsData);
      setCategories(catData);
      setMachineCategories(machineCatData);
    } catch {
      const ctx = alertCtxRef.current;
      console.warn(ctx.listFetchFallback);
    } finally {
      if (id === fetchRef.current) setIsLoading(false);
    }
  }, [alertCtxRef]);

  return { parts, categories, machineCategories, isLoading, fetchData, setParts };
}
