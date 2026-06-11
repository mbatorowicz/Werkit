import type {
  WizardCategory,
  WizardCustomer,
  WizardMachine,
  WizardMaterial,
  WizardMaterialCategory,
} from "@/types/wizard";
import type { WorkOrder } from "@/types/worker";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { appDialogApiMessage } from "@/components/AppDialogProvider";
import {
  narrowWizardCategories,
  narrowWizardCustomers,
  narrowWizardMachines,
  narrowWizardMaterials,
  narrowWorkOrders,
  narrowMaterialCategoryRows,
} from "@/lib/narrowApiListRows";
import { formatDueDatetimeLocal } from "@/features/admin/orders/dispatchPlanning";

function inferMaterialCategoryId(
  materialId: number | null | undefined,
  materials: WizardMaterial[]
): string {
  if (materialId == null) return "";
  const mat = materials.find((m) => m.id === materialId);
  const first = mat?.categoryIds?.[0];
  return first != null ? String(first) : "";
}

export type WorkerEditOrderListSetters = {
  setCategories: (v: WizardCategory[]) => void;
  setMachines: (v: WizardMachine[]) => void;
  setMaterials: (v: WizardMaterial[]) => void;
  setMaterialCategories: (v: WizardMaterialCategory[]) => void;
  setCustomers: (v: WizardCustomer[]) => void;
};

export type WorkerEditOrderIdSetters = {
  setCategoryId: (v: string) => void;
  setResourceId: (v: string) => void;
  setMaterialId: (v: string) => void;
  setMaterialCategoryId: (v: string) => void;
  setCustomerId: (v: string) => void;
};

export type WorkerEditOrderDetailSetters = {
  setQuantityTons: (v: string) => void;
  setTaskDescription: (v: string) => void;
  setRepairDescription: (v: string) => void;
};

export type WorkerEditOrderScheduleSetters = {
  setDueDate: (v: string) => void;
  setExpectedDurationHours: (v: string) => void;
};

export type LoadWorkerEditOrderArgs = {
  apiErrors: Record<string, string>;
  errNetwork: string;
  isCancelled: () => boolean;
  hydratedRef: { current: boolean };
  setLoadError: (v: string | null) => void;
  setUserId: (v: string) => void;
  setCanCreateCustomers: (v: boolean) => void;
  lists: WorkerEditOrderListSetters;
  ids: WorkerEditOrderIdSetters;
  details: WorkerEditOrderDetailSetters;
  schedule: WorkerEditOrderScheduleSetters;
};

function fetchWorkerEditOrderSources(orderId: number) {
  return Promise.all([
    fetchWithDeviceTelemetry(
      "Worker edit: categories",
      "/api/categories?leavesOnly=1",
      { cache: "no-store" },
      { category: "lifecycle" }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker edit: machines",
      "/api/machines",
      { cache: "no-store" },
      { category: "lifecycle" }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker edit: materials",
      "/api/materials",
      { cache: "no-store" },
      { category: "lifecycle" }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker edit: material-categories",
      "/api/material-categories?leavesOnly=1",
      { cache: "no-store" },
      { category: "lifecycle" }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker edit: customers",
      "/api/customers",
      { cache: "no-store" },
      { category: "lifecycle" }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      `Worker edit: order GET ${orderId}`,
      `/api/worker/work-orders/${orderId}`,
      { cache: "no-store" },
      { category: "orders" }
    ),
    fetchWithDeviceTelemetry(
      "Worker edit: session user",
      "/api/worker/session",
      { cache: "no-store" },
      { category: "session" }
    ).then(parseJsonUnknown),
  ]);
}

function applyOrderToEditForm(
  order: WorkOrder,
  matList: WizardMaterial[],
  a: LoadWorkerEditOrderArgs
) {
  a.ids.setCategoryId(String(order.categoryId));
  a.ids.setResourceId(order.resourceId != null ? String(order.resourceId) : "");
  a.ids.setMaterialId(order.materialId != null ? String(order.materialId) : "");
  a.ids.setMaterialCategoryId(inferMaterialCategoryId(order.materialId, matList));
  a.ids.setCustomerId(order.customerId != null ? String(order.customerId) : "");
  a.details.setQuantityTons(
    order.quantityTons != null && order.quantityTons > 0 ? String(order.quantityTons) : ""
  );
  a.details.setTaskDescription(order.taskDescription ?? "");
  a.details.setRepairDescription(order.repairDescription ?? "");
  a.schedule.setDueDate(formatDueDatetimeLocal(order.dueDate));
  a.schedule.setExpectedDurationHours(
    order.expectedDurationHours != null && order.expectedDurationHours > 0
      ? String(order.expectedDurationHours)
      : ""
  );
}

function applySessionUserToEditForm(
  sess: unknown,
  initialUserId: number | undefined,
  a: LoadWorkerEditOrderArgs
) {
  if (sess && typeof sess === "object" && !Array.isArray(sess)) {
    const user = (sess as { user?: { id?: number; canCreateCustomers?: boolean } }).user;
    if (initialUserId == null && typeof user?.id === "number") {
      a.setUserId(String(user.id));
    }
    if (typeof user?.canCreateCustomers === "boolean") {
      a.setCanCreateCustomers(user.canCreateCustomers);
    }
  }
}

export async function loadWorkerEditOrder(
  orderId: number,
  initialUserId: number | undefined,
  a: LoadWorkerEditOrderArgs
): Promise<void> {
  try {
    const [cat, mac, mat, matCats, cus, orderRes, sess] =
      await fetchWorkerEditOrderSources(orderId);
    if (a.isCancelled()) return;

    if (!orderRes.ok) {
      const body = await parseJsonUnknown(orderRes);
      const code = readApiErrorString(body);
      a.setLoadError(appDialogApiMessage(a.apiErrors, code, a.apiErrors.fetch_error));
      return;
    }

    const orderRaw = await parseJsonUnknown(orderRes);
    const orders = narrowWorkOrders(orderRaw != null ? [orderRaw] : []);
    const order = orders[0];
    if (!order) {
      a.setLoadError(a.apiErrors.order_not_found ?? a.apiErrors.fetch_error);
      return;
    }

    const matList = narrowWizardMaterials(mat);
    a.lists.setCategories(narrowWizardCategories(cat));
    a.lists.setMachines(narrowWizardMachines(mac));
    a.lists.setMaterials(matList);
    a.lists.setMaterialCategories(
      narrowMaterialCategoryRows(matCats).map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      }))
    );
    a.lists.setCustomers(narrowWizardCustomers(cus));

    applyOrderToEditForm(order, matList, a);
    a.hydratedRef.current = true;

    applySessionUserToEditForm(sess, initialUserId, a);
  } catch {
    a.setLoadError(a.errNetwork);
  }
}
