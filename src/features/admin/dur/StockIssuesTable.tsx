"use client";

import { AdminTableShell } from "@/components/Admin/AdminTableShell";
import type { StockIssue } from "@/types/dur";
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

interface StockIssuesTableProps {
  issues: (StockIssue & {
    partName?: string;
    partCatalogNumber?: string;
    creatorName?: string;
    workOrderLabel?: string;
    issuedToName?: string;
    resourceName?: string;
  })[];
  dict: {
    table: {
      date: string;
      part: string;
      catalogNumber: string;
      quantity: string;
      workOrder: string;
      issuedTo: string;
      resource: string;
      createdBy: string;
      notes: string;
    };
  };
}

export function StockIssuesTable({ issues, dict }: StockIssuesTableProps) {
  return (
    <AdminTableShell minWidthClass="min-w-[960px]">
      <thead className={TABLE_HEAD}>
        <tr className={TABLE_HEAD_ROW}>
          <th className={TABLE_TH}>{dict.table.date}</th>
          <th className={TABLE_TH}>{dict.table.part}</th>
          <th className={TABLE_TH}>{dict.table.catalogNumber}</th>
          <th className={TABLE_TH_RIGHT}>{dict.table.quantity}</th>
          <th className={TABLE_TH}>{dict.table.workOrder}</th>
          <th className={TABLE_TH}>{dict.table.issuedTo}</th>
          <th className={TABLE_TH}>{dict.table.resource}</th>
          <th className={TABLE_TH}>{dict.table.createdBy}</th>
          <th className={TABLE_TH}>{dict.table.notes}</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((iss) => (
          <tr key={iss.id} className={TABLE_BODY_ROW}>
            <td className={`${TABLE_TD_MUTED} text-xs`}>
              {new Date(iss.createdAt).toLocaleString()}
            </td>
            <td className={TABLE_TD_STRONG}>{iss.partName || `#${iss.partId}`}</td>
            <td className={TABLE_TD_MUTED}>{iss.partCatalogNumber || "—"}</td>
            <td className={`${TABLE_TD_RIGHT} font-mono tabular-nums`}>{iss.quantity}</td>
            <td className={TABLE_TD_MUTED}>
              {iss.workOrderLabel || (iss.workOrderId ? `#${iss.workOrderId}` : "—")}
            </td>
            <td className={TABLE_TD_MUTED}>
              {iss.issuedToName ?? (iss.issuedTo ? `#${iss.issuedTo}` : "—")}
            </td>
            <td className={TABLE_TD_MUTED}>{iss.resourceName ?? "—"}</td>
            <td className={TABLE_TD_MUTED}>{iss.creatorName || "—"}</td>
            <td className={`${TABLE_TD_MUTED} max-w-[200px] truncate text-xs`}>
              {iss.notes || "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </AdminTableShell>
  );
}
