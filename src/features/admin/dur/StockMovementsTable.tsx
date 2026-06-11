"use client";

import { formatDict, useDictionary } from "@/i18n";
import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import {
  TABLE_BODY_ROW,
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TD,
  TABLE_TD_MUTED,
  TABLE_TD_STRONG,
  TABLE_TH,
} from "@/lib/uiTable";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import type { StockReceipt, StockIssue } from "@/types/dur";
import type { DurSparePartCatalogItem } from "./useDurSparePartCatalog";

interface StockMovementsTableProps {
  tab: "receipts" | "issues";
  isLoading: boolean;
  searchQuery: string;
  filteredReceipts: StockReceipt[];
  filteredIssues: StockIssue[];
  partById: Map<number, DurSparePartCatalogItem>;
}

export function StockMovementsTable({
  tab,
  isLoading,
  searchQuery,
  filteredReceipts,
  filteredIssues,
  partById,
}: StockMovementsTableProps) {
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const dWh = dictionary.dur.warehouse;
  const common = dictionary.common;

  const rows = tab === "receipts" ? filteredReceipts : filteredIssues;
  const colSpan = tab === "issues" ? 6 : 4;

  return (
    <AdminTableShell>
      <thead className={TABLE_HEAD}>
        <tr className={TABLE_HEAD_ROW}>
          {tab === "issues" ? (
            <>
              <th className={TABLE_TH}>{dWh.colCollectedBy}</th>
              <th className={TABLE_TH}>{dWh.colResource}</th>
            </>
          ) : null}
          <th className={TABLE_TH}>{dWh.colPart}</th>
          <th className={TABLE_TH}>{wh.colQuantity}</th>
          <th className={TABLE_TH}>{wh.colDate}</th>
          <th className={TABLE_TH}>{wh.colNotes}</th>
        </tr>
      </thead>
      <tbody>
        {isLoading ? (
          <tr>
            <td colSpan={colSpan} className={TABLE_EMPTY_CELL}>
              {common.loading.default}
            </td>
          </tr>
        ) : rows.length === 0 ? (
          <tr>
            <td colSpan={colSpan} className={TABLE_EMPTY_CELL}>
              {searchQuery.trim()
                ? common.search.noResultsForQuery
                : tab === "receipts"
                  ? wh.emptyReceipts
                  : wh.emptyIssues}
            </td>
          </tr>
        ) : tab === "receipts" ? (
          filteredReceipts.map((row) => (
            <tr key={row.id} className={TABLE_BODY_ROW}>
              <td className={TABLE_TD_STRONG}>{row.partName ?? row.partId}</td>
              <td className={TABLE_TD}>
                {formatDict(wh.stockWithUnit, {
                  qty: row.quantity,
                  unit: partById.get(row.partId)?.unit ?? "szt",
                })}
              </td>
              <td className={TABLE_TD_MUTED}>{new Date(row.createdAt).toLocaleString()}</td>
              <td className={TABLE_TD_MUTED}>{row.notes ?? "—"}</td>
            </tr>
          ))
        ) : (
          filteredIssues.map((row) => (
            <tr key={row.id} className={TABLE_BODY_ROW}>
              <td className={TABLE_TD_STRONG}>{row.issuedToName ?? "—"}</td>
              <td className={TABLE_TD}>{row.resourceName ?? "—"}</td>
              <td className={TABLE_TD_STRONG}>{row.partName ?? row.partId}</td>
              <td className={TABLE_TD}>
                {formatDict(wh.stockWithUnit, {
                  qty: row.quantity,
                  unit: partById.get(row.partId)?.unit ?? "szt",
                })}
              </td>
              <td className={TABLE_TD_MUTED}>{new Date(row.createdAt).toLocaleString()}</td>
              <td className={TABLE_TD_MUTED}>{row.notes ?? "—"}</td>
            </tr>
          ))
        )}
      </tbody>
    </AdminTableShell>
  );
}
