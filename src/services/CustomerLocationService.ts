import { db } from "@/db";
import { customerLocations, customers, workOrders } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";
import { parseRouteWaypoints, serializeRouteWaypoints, type RouteWaypoint } from "@/lib/map/routeWaypoints";

export type CustomerLocationRow = {
  id: number;
  customerId: number;
  label: string;
  address: string | null;
  latitude: string;
  longitude: string;
  isDefault: boolean;
  sortOrder: number;
  routeWaypoints: RouteWaypoint[];
};

function mapRow(row: typeof customerLocations.$inferSelect): CustomerLocationRow {
  return {
    id: row.id,
    customerId: row.customerId,
    label: row.label,
    address: row.address,
    latitude: String(row.latitude),
    longitude: String(row.longitude),
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    routeWaypoints: parseRouteWaypoints(row.routeWaypoints),
  };
}

export class CustomerLocationService {
  static async listByCustomerId(customerId: number): Promise<CustomerLocationRow[]> {
    const rows = await db
      .select()
      .from(customerLocations)
      .where(eq(customerLocations.customerId, customerId))
      .orderBy(desc(customerLocations.isDefault), asc(customerLocations.sortOrder), desc(customerLocations.id));
    return rows.map(mapRow);
  }

  static async getById(id: number): Promise<CustomerLocationRow | null> {
    const [row] = await db.select().from(customerLocations).where(eq(customerLocations.id, id)).limit(1);
    return row ? mapRow(row) : null;
  }

  static async getDefaultForCustomer(customerId: number): Promise<CustomerLocationRow | null> {
    const [row] = await db
      .select()
      .from(customerLocations)
      .where(and(eq(customerLocations.customerId, customerId), eq(customerLocations.isDefault, true)))
      .limit(1);
    if (row) return mapRow(row);
    const [fallback] = await db
      .select()
      .from(customerLocations)
      .where(eq(customerLocations.customerId, customerId))
      .orderBy(asc(customerLocations.sortOrder), asc(customerLocations.id))
      .limit(1);
    return fallback ? mapRow(fallback) : null;
  }

  static async resolveForWorkOrder(workOrderId: number | null, customerId: number | null) {
    if (workOrderId) {
      const [wo] = await db
        .select({
          customerLocationId: workOrders.customerLocationId,
          customerId: workOrders.customerId,
        })
        .from(workOrders)
        .where(eq(workOrders.id, workOrderId))
        .limit(1);
      if (wo?.customerLocationId) {
        const loc = await CustomerLocationService.getById(wo.customerLocationId);
        if (loc) return loc;
      }
      if (wo?.customerId) {
        const def = await CustomerLocationService.getDefaultForCustomer(wo.customerId);
        if (def) return def;
      }
    }
    if (customerId) {
      return CustomerLocationService.getDefaultForCustomer(customerId);
    }
    return null;
  }

  static async createLocation(input: {
    customerId: number;
    label: string;
    address?: string | null;
    latitude: string;
    longitude: string;
    isDefault?: boolean;
    routeWaypoints?: RouteWaypoint[];
  }): Promise<CustomerLocationRow> {
    if (input.isDefault) {
      await db
        .update(customerLocations)
        .set({ isDefault: false })
        .where(eq(customerLocations.customerId, input.customerId));
    }
    const [row] = await db
      .insert(customerLocations)
      .values({
        customerId: input.customerId,
        label: input.label,
        address: input.address ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        isDefault: input.isDefault ?? false,
        routeWaypoints: serializeRouteWaypoints(input.routeWaypoints ?? []),
      })
      .returning();
    await CustomerLocationService.syncCustomerLegacyCoords(input.customerId);
    return mapRow(row);
  }

  static async updateLocation(
    id: number,
    input: Partial<{
      label: string;
      address: string | null;
      latitude: string;
      longitude: string;
      isDefault: boolean;
      routeWaypoints: RouteWaypoint[];
    }>,
  ): Promise<CustomerLocationRow | null> {
    const existing = await CustomerLocationService.getById(id);
    if (!existing) return null;
    if (input.isDefault) {
      await db
        .update(customerLocations)
        .set({ isDefault: false })
        .where(eq(customerLocations.customerId, existing.customerId));
    }
    const patch: Partial<typeof customerLocations.$inferInsert> = {};
    if (input.label !== undefined) patch.label = input.label;
    if (input.address !== undefined) patch.address = input.address;
    if (input.latitude !== undefined) patch.latitude = input.latitude;
    if (input.longitude !== undefined) patch.longitude = input.longitude;
    if (input.isDefault !== undefined) patch.isDefault = input.isDefault;
    if (input.routeWaypoints !== undefined) {
      patch.routeWaypoints = serializeRouteWaypoints(input.routeWaypoints);
    }
    const [row] = await db.update(customerLocations).set(patch).where(eq(customerLocations.id, id)).returning();
    await CustomerLocationService.syncCustomerLegacyCoords(existing.customerId);
    return row ? mapRow(row) : null;
  }

  static async setRouteWaypoints(id: number, waypoints: RouteWaypoint[]): Promise<CustomerLocationRow | null> {
    return CustomerLocationService.updateLocation(id, { routeWaypoints: waypoints });
  }

  static async deleteLocation(id: number): Promise<void> {
    const existing = await CustomerLocationService.getById(id);
    if (!existing) return;
    await db.delete(customerLocations).where(eq(customerLocations.id, id));
    const remaining = await CustomerLocationService.listByCustomerId(existing.customerId);
    if (remaining.length > 0 && !remaining.some((l) => l.isDefault)) {
      await CustomerLocationService.updateLocation(remaining[0].id, { isDefault: true });
    }
    await CustomerLocationService.syncCustomerLegacyCoords(existing.customerId);
  }

  /** Utrzymuje kolumny customers.latitude/longitude zgodne z domyślną lokalizacją (kompatybilność). */
  static async syncCustomerLegacyCoords(customerId: number): Promise<void> {
    const def = await CustomerLocationService.getDefaultForCustomer(customerId);
    if (!def) return;
    await db
      .update(customers)
      .set({
        latitude: def.latitude,
        longitude: def.longitude,
        defaultAddress: def.address,
      })
      .where(eq(customers.id, customerId));
  }

  static async ensureDefaultFromLegacyCustomer(customerId: number): Promise<CustomerLocationRow | null> {
    const existing = await CustomerLocationService.listByCustomerId(customerId);
    if (existing.length > 0) return existing[0];
    const [c] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (!c?.latitude || !c?.longitude) return null;
    return CustomerLocationService.createLocation({
      customerId,
      label: "Główna",
      address: c.defaultAddress,
      latitude: String(c.latitude),
      longitude: String(c.longitude),
      isDefault: true,
    });
  }
}
