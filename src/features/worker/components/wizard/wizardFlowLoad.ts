import type { WorkOrder } from "@/types/worker";
import type {
  WizardCategory,
  WizardCustomer,
  WizardMachine,
  WizardMaterial,
  WizardMaterialCategory,
} from "@/types/wizard";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown } from "@/lib/parseApiJson";
import {
  narrowWizardCategories,
  narrowWizardCustomers,
  narrowWizardMachines,
  narrowWizardMaterials,
  narrowWorkOrders,
  narrowMaterialCategoryRows,
} from "@/lib/narrowApiListRows";

export type WizardFlowLoadArgs = {
  isCancelled: () => boolean;
  lists: {
    setCategories: (v: WizardCategory[]) => void;
    setMachines: (v: WizardMachine[]) => void;
    setMaterials: (v: WizardMaterial[]) => void;
    setMaterialCategories: (v: WizardMaterialCategory[]) => void;
    setCustomers: (v: WizardCustomer[]) => void;
  };
  setOrders: (v: WorkOrder[]) => void;
  setUserId: (v: string) => void;
  setCanCreateCustomers: (v: boolean) => void;
};

function fetchWizardFlowSources() {
  return Promise.all([
    fetchWithDeviceTelemetry(
      "Worker wizard: categories",
      "/api/categories?leavesOnly=1",
      { cache: "no-store" },
      {
        category: "lifecycle",
      }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker wizard: machines",
      "/api/machines",
      { cache: "no-store" },
      {
        category: "lifecycle",
      }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker wizard: materials",
      "/api/materials",
      { cache: "no-store" },
      {
        category: "lifecycle",
      }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker wizard: material-categories",
      "/api/material-categories?leavesOnly=1",
      { cache: "no-store" },
      { category: "lifecycle" }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker wizard: customers",
      "/api/customers",
      { cache: "no-store" },
      {
        category: "lifecycle",
      }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker wizard: work-orders",
      "/api/worker/work-orders",
      { cache: "no-store" },
      {
        category: "orders",
      }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker wizard: session user",
      "/api/worker/session",
      { cache: "no-store" },
      {
        category: "session",
      }
    ).then(parseJsonUnknown),
  ]);
}

export async function loadWizardFlowData(
  initialUserId: number | undefined,
  a: WizardFlowLoadArgs
): Promise<void> {
  try {
    const [cat, mac, mat, matCats, cus, ord, sess] = await fetchWizardFlowSources();
    if (a.isCancelled()) return;
    a.lists.setCategories(narrowWizardCategories(cat));
    a.lists.setMachines(narrowWizardMachines(mac));
    a.lists.setMaterials(narrowWizardMaterials(mat));
    a.lists.setMaterialCategories(
      narrowMaterialCategoryRows(matCats).map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      }))
    );
    a.lists.setCustomers(narrowWizardCustomers(cus));
    a.setOrders(narrowWorkOrders(ord));
    if (sess && typeof sess === "object" && !Array.isArray(sess)) {
      const user = (sess as { user?: { id?: number; canCreateCustomers?: boolean } }).user;
      if (initialUserId == null && typeof user?.id === "number") {
        a.setUserId(String(user.id));
      }
      if (typeof user?.canCreateCustomers === "boolean") {
        a.setCanCreateCustomers(user.canCreateCustomers);
      }
    }
  } catch {
    /* sieć — zostaw puste listy */
  }
}
