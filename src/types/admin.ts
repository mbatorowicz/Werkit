import type { WorkOrderPriority } from "./worker";

export type UnifiedGanttItem = {
  _type: 'ORDER' | 'SESSION';
  id: number;
  userId?: number | null;
  resourceId?: number | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  dueDate?: string | Date | null;
  expectedDurationHours?: number | string | null;
  status?: string;
  workOrderId?: number | null;
  workerName?: string | null;
  resourceName?: string | null;
  creatorName?: string | null;
  materialName?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  quantityTons?: number | string | null;
  taskDescription?: string | null;
  priority?: WorkOrderPriority | string | null;
  categoryId?: number | null;
  categoryName?: string | null;
  categoryIsStationary?: boolean | null;
  customerId?: number | null;
  materialId?: number | null;
  createdAt?: string | Date | null;
  _sortDate?: number;
  _statusGroup?: number;
  [key: string]: unknown;
};

export interface OrderFormState {
  userId: string;
  resourceId: string;
  categoryId: string;
  materialId: string;
  customerId: string;
  taskDescription: string;
  quantityTons: string;
  priority: string;
  expectedDurationHours: string;
  dueDate: string;
  forceSave: boolean;
}

export type BaseWorker = {
  id: number;
  fullName: string;
};

export type BaseMachine = {
  id: number;
  name: string;
  brand?: string;
  model?: string;
  registrationNumber?: string;
  categoryIds?: number[]; // IDs of classifiers
  imageUrl?: string | null;
};

export type BaseMaterial = {
  id: number;
  name: string;
  categoryIds?: number[];
};

export type BaseCustomer = {
  id: number;
  firstName: string | null;
  lastName: string;
};

export type BaseCategory = {
  id: number;
  name: string;
  reqCustomer: boolean;
  reqMaterial: boolean;
  reqQuantity: boolean;
  reqTaskDescription: boolean;
  isGlobal: boolean;
  /** Warsztat / plac — bez GPS trasy i bez „dojechał na miejsce” wg odległości. */
  isStationary: boolean;
  color?: string | null;
};

/** Wiersz aktywnej sesji w module Raporty (serwer → RSC). */
export type ReportActiveSessionRow = {
  id: number;
  sessionType: string;
  categoryName: string | null;
  taskDescription: string | null;
  startTime: Date;
  userId: number;
  userName: string | null;
  resourceName: string | null;
  quantityTons: string | null;
};

/** Zmaterializowany zestaw danych pod `/admin/reports`. */
export type ReportsDashboardSnapshot = {
  generatedAt: string;
  companyName: string | null;
  companyCity: string | null;
  mapLat: number;
  mapLng: number;
  pendingOrdersTotal: number;
  workersWithPendingOrders: number;
  workersActiveNow: number;
  activeSessions: ReportActiveSessionRow[];
  activeSessionsByCategory: { categoryName: string | null; count: number }[];
  completedSessionsThisMonth: number;
  completedSessionsPrevMonth: number;
  monthOverMonthPercent: number | null;
  tonsThisMonth: number;
  topMachinesThisMonth: { name: string; sessionCount: number }[];
};
