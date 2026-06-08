"use client";

import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import { parseDecimalInput } from "@/lib/decimalInput";
import type { StockReceipt } from "@/types/dur";
import {
  TABLE_BODY_ROW,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TD_MUTED,
  TABLE_TD_RIGHT,
  TABLE_TD_STRONG,
  TABLE_TH,
  TABLE_TH_RIGHT,
} from "@/lib/uiTable";

interface StockReceiptsTableProps {
  receipts: (StockReceipt & {
    partName?: string;
    partCatalogNumber?: string;
    creatorName?: string;
  })[];
  dict: {
    table: {
      date: string;
      part: string;
      catalogNumber: string;
      quantity: string;
      unitPrice: string;
      totalValue: string;
      invoiceNumber: string;
      createdBy: string;
      notes: string;
    };
  };
}

export function StockReceiptsTable({ receipts, dict }: StockReceiptsTableProps) {
  return (
    <AdminTableShell minWidthClass="min-w-[960px]">
      <thead className={TABLE_HEAD}>
        <tr className={TABLE_HEAD_ROW}>
          <th className={TABLE_TH}>{dict.table.date}</th>
          <th className={TABLE_TH}>{dict.table.part}</th>
          <th className={TABLE_TH}>{dict.table.catalogNumber}</th>
          <th className={TABLE_TH_RIGHT}>{dict.table.quantity}</th>
          <th className={TABLE_TH_RIGHT}>{dict.table.unitPrice}</th>
          <th className={TABLE_TH_RIGHT}>{dict.table.totalValue}</th>
          <th className={TABLE_TH}>{dict.table.invoiceNumber}</th>
          <th className={TABLE_TH}>{dict.table.createdBy}</th>
          <th className={TABLE_TH}>{dict.table.notes}</th>
        </tr>
      </thead>
      <tbody>
        {receipts.map((r) => (
          <tr key={r.id} className={TABLE_BODY_ROW}>
            <td className={`${TABLE_TD_MUTED} text-xs`}>
              {new Date(r.createdAt).toLocaleString()}
            </td>
            <td className={TABLE_TD_STRONG}>{r.partName || `#${r.partId}`}</td>
            <td className={TABLE_TD_MUTED}>{r.partCatalogNumber || "—"}</td>
            <td className={`${TABLE_TD_RIGHT} font-mono tabular-nums`}>{r.quantity}</td>
            <td className={`${TABLE_TD_RIGHT} font-mono tabular-nums`}>{r.unitPrice || "—"}</td>
            <td className={`${TABLE_TD_RIGHT} font-mono tabular-nums`}>
              {r.unitPrice && r.quantity
                ? (
                    (parseDecimalInput(r.unitPrice) ?? 0) * (parseDecimalInput(r.quantity) ?? 0)
                  ).toFixed(2)
                : "—"}
            </td>
            <td className={TABLE_TD_MUTED}>{r.invoiceNumber || "—"}</td>
            <td className={TABLE_TD_MUTED}>{r.creatorName || "—"}</td>
            <td className={`${TABLE_TD_MUTED} max-w-[200px] truncate text-xs`}>
              {r.notes || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </AdminTableShell>
  );
}
