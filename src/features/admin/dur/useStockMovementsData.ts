"use client";

import { useCallback, useMemo, useState } from "react";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { narrowStockReceipts, narrowStockIssues } from "@/lib/narrow/dur";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseDecimalInput } from "@/lib/decimalInput";
import type { StockReceipt, StockIssue } from "@/types/dur";
import type { DurSparePartCatalogItem } from "./useDurSparePartCatalog";

interface UseStockMovementsDataArgs {
  tab: "receipts" | "issues";
  searchQuery: string;
  partById: Map<number, DurSparePartCatalogItem>;
}

export function useStockMovementsData({ tab, searchQuery, partById }: UseStockMovementsDataArgs) {
  const [receipts, setReceipts] = useState<StockReceipt[]>([]);
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recRes, issRes] = await Promise.all([
        fetch("/api/dur/stock/receipts", { cache: "no-store" }),
        fetch("/api/dur/stock/issues", { cache: "no-store" }),
      ]);
      setReceipts(narrowStockReceipts(await parseJsonArray(recRes)));
      setIssues(narrowStockIssues(await parseJsonArray(issRes)));
    } catch {
      setReceipts([]);
      setIssues([]);
    }
    setIsLoading(false);
  }, []);

  const filteredReceipts = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return receipts;
    return receipts.filter((row) => {
      const haystack = [
        row.partName,
        row.partCatalogNumber,
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
        row.issuedToName,
        row.resourceName,
        row.partName,
        row.partCatalogNumber,
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

  const issueTotalsByPart = useMemo(() => {
    if (tab !== "issues" || !searchQuery.trim() || filteredIssues.length === 0) return [];
    const totals = new Map<number, { partName: string; quantity: number; unit: string }>();
    for (const row of filteredIssues) {
      const qty = parseDecimalInput(row.quantity) ?? 0;
      const unit = partById.get(row.partId)?.unit ?? "szt";
      const existing = totals.get(row.partId);
      if (existing) {
        existing.quantity += qty;
      } else {
        totals.set(row.partId, {
          partName: row.partName ?? String(row.partId),
          quantity: qty,
          unit,
        });
      }
    }
    return [...totals.values()].sort((a, b) => a.partName.localeCompare(b.partName, "pl"));
  }, [tab, searchQuery, filteredIssues, partById]);

  return { isLoading, fetchData, filteredReceipts, filteredIssues, issueTotalsByPart };
}
