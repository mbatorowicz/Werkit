"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { materialsApi } from "@/lib/appRoutes";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseDecimalInput } from "@/lib/decimalInput";
import {
  narrowMaterialStockIssues,
  narrowMaterialStockReceipts,
} from "@/lib/narrow/materials-warehouse";
import type { MaterialStockIssue, MaterialStockReceipt } from "@/types/materials-warehouse";
import type { MaterialRow } from "@/features/admin/materials/types";

interface UseMaterialStockMovementsArgs {
  tab: "receipts" | "issues";
  searchQuery: string;
  materialById: Map<number, MaterialRow>;
}

export function useMaterialStockMovements({
  tab,
  searchQuery,
  materialById,
}: UseMaterialStockMovementsArgs) {
  const [receipts, setReceipts] = useState<MaterialStockReceipt[]>([]);
  const [issues, setIssues] = useState<MaterialStockIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMovements = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rRes, iRes] = await Promise.all([
        fetch(materialsApi.stockReceipts, { cache: "no-store" }),
        fetch(materialsApi.stockIssues, { cache: "no-store" }),
      ]);
      setReceipts(narrowMaterialStockReceipts(await parseJsonArray(rRes)));
      setIssues(narrowMaterialStockIssues(await parseJsonArray(iRes)));
    } catch {
      /* sieć */
    }
    setIsLoading(false);
  }, []);

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return receipts;
    return receipts.filter((row) => {
      const haystack = [
        row.materialName,
        row.notes,
        row.invoiceNumber,
        row.quantity,
        new Date(row.createdAt).toLocaleString(),
      ]
        .filter(Boolean)
        .join(" ");
      return matchesSearchQuery(haystack, q);
    });
  }, [receipts, searchQuery]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return issues;
    return issues.filter((row) => {
      const haystack = [
        row.materialName,
        row.customerName,
        row.notes,
        row.workOrderLabel,
        row.workOrderId != null ? `#${row.workOrderId}` : null,
        row.quantity,
        new Date(row.createdAt).toLocaleString(),
      ]
        .filter(Boolean)
        .join(" ");
      return matchesSearchQuery(haystack, q);
    });
  }, [issues, searchQuery]);

  const issueTotalsByMaterial = useMemo(() => {
    if (tab !== "issues" || !searchQuery.trim() || filteredIssues.length === 0) return [];
    const totals = new Map<number, { materialName: string; quantity: number; unit: string }>();
    for (const row of filteredIssues) {
      const qty = parseDecimalInput(row.quantity) ?? 0;
      const unit = materialById.get(row.materialId)?.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT;
      const existing = totals.get(row.materialId);
      if (existing) {
        existing.quantity += qty;
      } else {
        totals.set(row.materialId, {
          materialName: row.materialName ?? String(row.materialId),
          quantity: qty,
          unit,
        });
      }
    }
    return [...totals.values()].sort((a, b) => a.materialName.localeCompare(b.materialName, "pl"));
  }, [tab, searchQuery, filteredIssues, materialById]);

  return { isLoading, loadMovements, filteredReceipts, filteredIssues, issueTotalsByMaterial };
}
