import { eq, aliasedTable, type SQL } from "drizzle-orm";
import {
  workOrders,
  resources,
  materials,
  customers,
  users,
  resourceCategories,
} from "@/db/schema";
import { sqlWorkOrderHasNotes, sqlWorkOrderHasPhotos } from "@/services/sql/attachmentExistsSql";

/** Alias `users` dla `created_by` — jedna instancja na zapytanie listy zleceń. */
export function newWorkOrderCreatorUserAlias() {
  return aliasedTable(users, "creator");
}

export type WorkOrderCreatorUserAlias = ReturnType<typeof newWorkOrderCreatorUserAlias>;

/**
 * Wspólne pola SELECT listy zleceń z joinów:
 * resources, materials, customers, creator, resourceCategories.
 * Opcjonalnie dołącz `users` (przypisany pracownik) przez {@link applyWorkOrderListJoins}.
 */
export function workOrderListSharedSelectFields(creator: WorkOrderCreatorUserAlias) {
  return {
    id: workOrders.id,
    categoryId: workOrders.categoryId,
    categoryName: resourceCategories.name,
    taskDescription: workOrders.taskDescription,
    resourceName: resources.name,
    materialName: materials.name,
    resourceId: workOrders.resourceId,
    materialId: workOrders.materialId,
    customerId: workOrders.customerId,
    creatorName: creator.fullName,
    quantityTons: workOrders.quantityTons,
    expectedDurationHours: workOrders.expectedDurationHours,
    priority: workOrders.priority,
    dueDate: workOrders.dueDate,
    createdAt: workOrders.createdAt,
    hasPhotos: sqlWorkOrderHasPhotos(),
    hasNotes: sqlWorkOrderHasNotes(),
  };
}

/** Minimalny kontrakt fluent buildera Drizzle pod łańcuch `leftJoin`. */
type WorkOrderJoinFluent = {
  leftJoin: (table: unknown, on: SQL) => WorkOrderJoinFluent;
};

/**
 * Jednolita kolejność LEFT JOIN od `work_orders`:
 * opcjonalnie przypisany pracownik (`users`), potem zasób, materiał, klient, twórca, kategoria.
 */
export function applyWorkOrderListJoins<Q>(qb: Q, creator: WorkOrderCreatorUserAlias, opts: { joinAssignedWorker: boolean }): Q {
  let q = qb as unknown as WorkOrderJoinFluent;
  if (opts.joinAssignedWorker) {
    q = q.leftJoin(users, eq(workOrders.userId, users.id));
  }
  q = q
    .leftJoin(resources, eq(workOrders.resourceId, resources.id))
    .leftJoin(materials, eq(workOrders.materialId, materials.id))
    .leftJoin(customers, eq(workOrders.customerId, customers.id))
    .leftJoin(creator, eq(workOrders.createdById, creator.id))
    .leftJoin(resourceCategories, eq(workOrders.categoryId, resourceCategories.id));
  return q as Q;
}
