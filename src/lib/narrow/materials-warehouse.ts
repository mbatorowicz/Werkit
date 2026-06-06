import { isRecord } from "./shared";
import type { MaterialStockIssue, MaterialStockReceipt } from "@/types/materials-warehouse";

function readString(r: Record<string, unknown>, k: string, fallback = ""): string {
  return typeof r[k] === "string" ? r[k] : fallback;
}

function readNumber(r: Record<string, unknown>, k: string): number {
  return typeof r[k] === "number" ? r[k] : parseInt(String(r[k]), 10);
}

function readNullableString(r: Record<string, unknown>, k: string): string | null {
  if (r[k] === null) return null;
  return typeof r[k] === "string" ? r[k] : null;
}

function narrowReceiptRaw(r: Record<string, unknown>): MaterialStockReceipt | null {
  if (!r.id || !r.materialId) return null;
  return {
    id: readNumber(r, "id"),
    companyId: readNumber(r, "companyId"),
    materialId: readNumber(r, "materialId"),
    quantity: readString(r, "quantity", "0"),
    unitPrice: r.unitPrice != null ? readString(r, "unitPrice") : null,
    invoiceNumber: readNullableString(r, "invoiceNumber"),
    notes: readNullableString(r, "notes"),
    createdBy: r.createdBy != null ? readNumber(r, "createdBy") : null,
    createdAt: readString(r, "createdAt"),
    workSessionId: r.workSessionId != null ? readNumber(r, "workSessionId") : null,
    materialName: readNullableString(r, "materialName") ?? undefined,
    creatorName: readNullableString(r, "creatorName") ?? undefined,
  };
}

function narrowIssueRaw(r: Record<string, unknown>): MaterialStockIssue | null {
  if (!r.id || !r.materialId) return null;
  return {
    id: readNumber(r, "id"),
    companyId: readNumber(r, "companyId"),
    materialId: readNumber(r, "materialId"),
    quantity: readString(r, "quantity", "0"),
    workOrderId: r.workOrderId != null ? readNumber(r, "workOrderId") : null,
    workSessionId: r.workSessionId != null ? readNumber(r, "workSessionId") : null,
    issuedTo: r.issuedTo != null ? readNumber(r, "issuedTo") : null,
    notes: readNullableString(r, "notes"),
    createdBy: r.createdBy != null ? readNumber(r, "createdBy") : null,
    createdAt: readString(r, "createdAt"),
    materialName: readNullableString(r, "materialName") ?? undefined,
    creatorName: readNullableString(r, "creatorName") ?? undefined,
    workOrderLabel: readNullableString(r, "workOrderLabel") ?? undefined,
  };
}

export function narrowMaterialStockReceipts(data: unknown): MaterialStockReceipt[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => (isRecord(item) ? narrowReceiptRaw(item) : null))
    .filter((x): x is MaterialStockReceipt => x !== null);
}

export function narrowMaterialStockIssues(data: unknown): MaterialStockIssue[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => (isRecord(item) ? narrowIssueRaw(item) : null))
    .filter((x): x is MaterialStockIssue => x !== null);
}
