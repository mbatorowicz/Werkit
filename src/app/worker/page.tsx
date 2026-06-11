import WorkerClient from "./WorkerClient";
import { InitialWorkerData, Session } from "@/types/worker";
import { getUserId } from "@/lib/auth";
import { requireServerCompanyId } from "@/lib/serverTenant";
import type { WorkerSessionService as WorkerSessionServiceType } from "@/services/WorkerSessionService";

export const dynamic = "force-dynamic";

type ActiveSessionDetails = Awaited<
  ReturnType<typeof WorkerSessionServiceType.getActiveSessionWithDetails>
>;
type RawSession = NonNullable<ActiveSessionDetails["session"]>;

function mapSessionCustomer(
  rawSession: RawSession
): Pick<
  Session,
  | "customerAddress"
  | "customerLat"
  | "customerLng"
  | "customerFirstName"
  | "customerLastName"
  | "customerPhone"
> {
  return {
    customerAddress: rawSession.customerAddress ?? null,
    customerLat: rawSession.customerLat ? String(rawSession.customerLat) : null,
    customerLng: rawSession.customerLng ? String(rawSession.customerLng) : null,
    customerFirstName: rawSession.customerFirstName ?? null,
    customerLastName: rawSession.customerLastName ?? null,
    customerPhone: rawSession.customerPhone ?? null,
  };
}

function mapSession(rawSession: RawSession): Session {
  return {
    id: rawSession.id,
    startTime: rawSession.startTime.toISOString(),
    endTime: rawSession.endTime ? rawSession.endTime.toISOString() : undefined,
    status: rawSession.status,
    categoryId: rawSession.categoryId ?? 0,
    categoryName: rawSession.categoryName ?? null,
    categoryColor:
      rawSession.categoryColor === null || typeof rawSession.categoryColor === "string"
        ? rawSession.categoryColor
        : null,
    categoryIsStationary: Boolean(
      rawSession &&
      typeof rawSession === "object" &&
      "categoryIsStationary" in rawSession &&
      (rawSession as { categoryIsStationary?: boolean }).categoryIsStationary
    ),
    workOrderId: rawSession.workOrderId ?? null,
    resourceName: rawSession.resourceName ?? null,
    materialName: rawSession.materialName ?? null,
    taskDescription: rawSession.taskDescription ?? null,
    quantityTons: rawSession.quantityTons ? parseFloat(rawSession.quantityTons as string) : null,
    expectedDurationHours: rawSession.expectedDurationHours ?? null,
    ...mapSessionCustomer(rawSession),
  };
}

export default async function WorkerPage() {
  const userId = await getUserId();
  if (!userId) {
    return <WorkerClient initialData={null} />;
  }

  const companyId = await requireServerCompanyId();
  const { WorkerOrderService } = await import("@/services/WorkerOrderService");
  const { WorkerSessionService } = await import("@/services/WorkerSessionService");

  const { DelegationScopeService } = await import("@/services/DelegationScopeService");

  const [ordersRaw, sessionDetails, hasDelegationRights] = await Promise.all([
    WorkerOrderService.getPendingOrders(userId, companyId),
    WorkerSessionService.getActiveSessionWithDetails(userId, companyId),
    DelegationScopeService.hasDelegationRights(companyId, userId),
  ]);

  const orders = ordersRaw.map((o) => ({
    ...o,
    userId: Number(o.userId),
    resourceId: o.resourceId != null ? Number(o.resourceId) : null,
    dueDate: o.dueDate ? o.dueDate.toISOString() : null,
    createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
    expectedDurationHours: o.expectedDurationHours
      ? parseFloat(o.expectedDurationHours as string)
      : null,
    quantityTons: o.quantityTons ? parseFloat(o.quantityTons as string) : null,
    customerName: o.customerName || null,
    categoryId: Number(o.categoryId),
    categoryName: (o.categoryName as string) || null,
    categoryColor:
      o.categoryColor === null || typeof o.categoryColor === "string"
        ? (o.categoryColor as string | null)
        : null,
    orderType: (o.orderType as "machine_work" | "machine_repair" | null) ?? null,
    repairDescription: (o.repairDescription as string | null) ?? null,
  }));

  const rawSession = sessionDetails.session;
  const mappedSession: Session | null = rawSession ? mapSession(rawSession) : null;

  const initialData: InitialWorkerData = {
    settings: sessionDetails.settings,
    user: sessionDetails.user,
    workOrders: orders,
    session: mappedSession,
    events: sessionDetails.events.map((e) => ({
      id: e.id,
      photoUrl: e.photoUrl ?? null,
      latitude: e.latitude ? String(e.latitude) : null,
      longitude: e.longitude ? String(e.longitude) : null,
      createdAt: new Date(e.createdAt),
    })),
    notes: sessionDetails.notes.map((n) => ({
      id: n.id,
      note: n.note,
      latitude: n.latitude ? String(n.latitude) : null,
      longitude: n.longitude ? String(n.longitude) : null,
      createdAt: new Date(n.createdAt),
    })),
    hasDelegationRights,
  };

  return <WorkerClient initialData={initialData} />;
}
