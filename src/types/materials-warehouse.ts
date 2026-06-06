/** Typy magazynu materiałów (PZ/WZ, stan). */

export type MaterialInventoryRow = {
  id: number;
  companyId: number;
  materialId: number;
  quantity: string;
  updatedAt: string;
  materialName?: string;
};

export type MaterialStockReceipt = {
  id: number;
  companyId: number;
  materialId: number;
  quantity: string;
  unitPrice: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  workSessionId: number | null;
  materialName?: string;
  creatorName?: string;
};

export type MaterialStockIssue = {
  id: number;
  companyId: number;
  materialId: number;
  quantity: string;
  workOrderId: number | null;
  workSessionId: number | null;
  issuedTo: number | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  materialName?: string;
  creatorName?: string;
  workOrderLabel?: string;
  customerName?: string;
};

export type MaterialStockReceiptInput = {
  materialId: number;
  quantity: string;
  unitPrice?: string | null;
  invoiceNumber?: string | null;
  notes?: string | null;
  workSessionId?: number | null;
};

export type MaterialStockIssueInput = {
  materialId: number;
  quantity: string;
  workOrderId?: number | null;
  workSessionId?: number | null;
  issuedTo?: number | null;
  notes?: string | null;
};

export type MaterialInventoryAdjustmentInput = {
  materialId: number;
  quantity: string;
};
