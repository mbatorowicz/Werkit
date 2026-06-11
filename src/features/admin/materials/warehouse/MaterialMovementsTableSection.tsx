"use client";

import { formatDict, useDictionary } from "@/i18n";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
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
import { decimalStringForStorage } from "@/lib/decimalInput";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import type { MaterialStockIssue, MaterialStockReceipt } from "@/types/materials-warehouse";
import type { MaterialRow } from "@/features/admin/materials/types";

export interface MaterialIssueTotalItem {
  materialName: string;
  quantity: number;
  unit: string;
}

interface MaterialMovementsTableSectionProps {
  tab: "receipts" | "issues";
  isLoading: boolean;
  searchQuery: string;
  filteredReceipts: MaterialStockReceipt[];
  filteredIssues: MaterialStockIssue[];
  issueTotalsByMaterial: MaterialIssueTotalItem[];
  materialById: Map<number, MaterialRow>;
}

export function MaterialMovementsTableSection({
  tab,
  isLoading,
  searchQuery,
  filteredReceipts,
  filteredIssues,
  issueTotalsByMaterial,
  materialById,
}: MaterialMovementsTableSectionProps) {
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const matWh = dictionary.admin.materials.warehouse;
  const common = dictionary.common;

  const rows = tab === "receipts" ? filteredReceipts : filteredIssues;
  const colSpan = tab === "issues" ? 5 : 4;

  return (
    <>
      {issueTotalsByMaterial.length > 0 ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <p className="mb-2 font-medium text-emerald-900 dark:text-emerald-200">
            {wh.movementsFilterSummary}
          </p>
          <ul className="space-y-1 text-emerald-800 dark:text-emerald-300">
            {issueTotalsByMaterial.map((item) => (
              <li key={item.materialName}>
                {formatDict(wh.movementsFilterSummaryLine, {
                  item: item.materialName,
                  qty: decimalStringForStorage(String(item.quantity)) ?? String(item.quantity),
                  unit: item.unit,
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <AdminTableShell>
        <thead className={TABLE_HEAD}>
          <tr className={TABLE_HEAD_ROW}>
            {tab === "issues" ? <th className={TABLE_TH}>{matWh.colCustomer}</th> : null}
            <th className={TABLE_TH}>{matWh.colMaterial}</th>
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
          ) : (
            rows.map((row) => (
              <tr key={row.id} className={TABLE_BODY_ROW}>
                {tab === "issues" ? (
                  <td className={TABLE_TD_STRONG}>
                    {"customerName" in row && row.customerName ? row.customerName : "—"}
                  </td>
                ) : null}
                <td className={TABLE_TD_STRONG}>{row.materialName ?? row.materialId}</td>
                <td className={TABLE_TD}>
                  {formatDict(wh.stockWithUnit, {
                    qty: row.quantity,
                    unit: materialById.get(row.materialId)?.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
                  })}
                </td>
                <td className={TABLE_TD_MUTED}>{new Date(row.createdAt).toLocaleString()}</td>
                <td className={TABLE_TD_MUTED}>{row.notes ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTableShell>
    </>
  );
}
