"use client";

import { useCallback, useState } from "react";
import { narrowSpareParts } from "@/lib/narrow/dur";

export type DurSparePartCatalogItem = {
  id: number;
  name: string;
  catalogNumber: string;
  unit: string;
  stockQuantity: string;
  purchasePrice: string | null;
  isActive: boolean;
};

type FetchOpts = {
  resourceGroupId?: number | null;
  activeOnly?: boolean;
  /** Worker używa `/api/worker/dur/spare-parts` (ze stanem w jednej odpowiedzi). */
  audience?: "admin" | "worker";
};

/**
 * Katalog części + stan magazynowy — comboboxy (admin + worker).
 */
export function useDurSparePartCatalog() {
  const [items, setItems] = useState<DurSparePartCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCatalog = useCallback(async (opts?: FetchOpts) => {
    setIsLoading(true);
    try {
      const groupQ =
        opts?.resourceGroupId != null
          ? `?compatibleWithResourceGroupId=${opts.resourceGroupId}`
          : "";

      if (opts?.audience === "worker") {
        const res = await fetch(`/api/worker/dur/spare-parts${groupQ}`);
        const parts = narrowSpareParts(await res.json());
        let mapped: DurSparePartCatalogItem[] = parts.map((p) => ({
          id: p.id,
          name: p.name,
          catalogNumber: p.catalogNumber,
          unit: p.unit,
          stockQuantity: p.stockQuantity ?? "0",
          purchasePrice: p.purchasePrice,
          isActive: p.isActive,
        }));
        if (opts?.activeOnly !== false) {
          mapped = mapped.filter((p) => p.isActive);
        }
        setItems(mapped);
        return;
      }

      const partsUrl =
        opts?.resourceGroupId != null
          ? `/api/dur/spare-parts?compatibleWithResourceGroupId=${opts.resourceGroupId}`
          : "/api/dur/spare-parts";
      const [partsRes, invRes] = await Promise.all([fetch(partsUrl), fetch("/api/dur/inventory")]);
      const parts = narrowSpareParts(await partsRes.json());
      const invData = await invRes.json();
      const invRows = Array.isArray(invData) ? invData : [];
      const qtyByPart = new Map<number, string>();
      for (const row of invRows) {
        if (row && typeof row === "object" && "partId" in row && "quantity" in row) {
          const r = row as { partId: number; quantity: string };
          qtyByPart.set(r.partId, String(r.quantity));
        }
      }

      let mapped: DurSparePartCatalogItem[] = parts.map((p) => ({
        id: p.id,
        name: p.name,
        catalogNumber: p.catalogNumber,
        unit: p.unit,
        stockQuantity: qtyByPart.get(p.id) ?? "0",
        purchasePrice: p.purchasePrice,
        isActive: p.isActive,
      }));

      if (opts?.activeOnly !== false) {
        mapped = mapped.filter((p) => p.isActive);
      }
      setItems(mapped);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { items, isLoading, fetchCatalog };
}
