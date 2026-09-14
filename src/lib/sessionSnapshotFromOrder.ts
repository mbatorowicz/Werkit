/**
 * Snapshot pól zlecenia na `work_sessions` przy akceptacji.
 * Sesja trzyma własną kopię orderType / materiału / ilości — późniejsza edycja zlecenia ich nie rusza.
 */
export type AcceptedOrderSnapshotSource = {
  id: number;
  categoryId: number | null;
  resourceId: number;
  materialId: number | null;
  customerId: number | null;
  taskDescription: string | null;
  quantityTons: string | null;
  expectedDurationHours: string | null;
  dueDate: Date | null;
  orderType: string;
  repairDescription: string | null;
};

export type SessionInsertFromAcceptedOrder = {
  companyId: number;
  workOrderId: number;
  userId: number;
  categoryId: number;
  resourceId: number;
  materialId: number | null;
  customerId: number | null;
  taskDescription: string | null;
  quantityTons: string | null;
  expectedDurationHours: string | null;
  dueDate: Date | null;
  status: "IN_PROGRESS";
  orderType: string;
  repairDescription: string | null;
  startLatitude?: string;
  startLongitude?: string;
};

export function sessionInsertFromAcceptedOrder(
  order: AcceptedOrderSnapshotSource,
  ctx: {
    companyId: number;
    userId: number;
    startCoord?: { lat: string; lng: string } | null;
  }
): SessionInsertFromAcceptedOrder {
  return {
    companyId: ctx.companyId,
    workOrderId: order.id,
    userId: ctx.userId,
    categoryId: order.categoryId!,
    resourceId: order.resourceId,
    materialId: order.materialId,
    customerId: order.customerId,
    taskDescription: order.taskDescription,
    quantityTons: order.quantityTons,
    expectedDurationHours: order.expectedDurationHours,
    dueDate: order.dueDate,
    status: "IN_PROGRESS",
    orderType: order.orderType,
    repairDescription: order.repairDescription,
    ...(ctx.startCoord
      ? {
          startLatitude: ctx.startCoord.lat,
          startLongitude: ctx.startCoord.lng,
        }
      : {}),
  };
}
