import { db } from '@/db';
import { customers, customerLocations } from '@/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';

export class CustomerService {
  static async getCustomers(companyId: number) {
    const rows = await db
      .select()
      .from(customers)
      .where(eq(customers.companyId, companyId))
      .orderBy(desc(customers.id));

    if (rows.length === 0) return [];

    const customerIds = rows.map((r) => r.id);
    const locationRows = await db
      .select({
        customerId: customerLocations.customerId,
        label: customerLocations.label,
        address: customerLocations.address,
      })
      .from(customerLocations)
      .where(inArray(customerLocations.customerId, customerIds));

    const locationsByCustomer = new Map<number, string[]>();
    for (const loc of locationRows) {
      const parts: string[] = [];
      if (typeof loc.label === "string" && loc.label.trim() && loc.label.trim() !== "Główna") {
        parts.push(loc.label.trim());
      }
      if (typeof loc.address === "string" && loc.address.trim()) {
        parts.push(loc.address.trim());
      }
      if (parts.length === 0) continue;
      const text = parts.join(" — ");
      const arr = locationsByCustomer.get(loc.customerId) ?? [];
      if (!arr.includes(text)) arr.push(text);
      locationsByCustomer.set(loc.customerId, arr);
    }

    return rows.map((row) => ({
      ...row,
      locationAddresses: locationsByCustomer.get(row.id) ?? [],
    }));
  }

  static async addCustomer(
    companyId: number,
    firstName: string | null,
    lastName: string,
    defaultAddress?: string | null,
    latitude?: string | null,
    longitude?: string | null,
  ) {
    const [row] = await db
      .insert(customers)
      .values({ companyId, firstName, lastName, defaultAddress, latitude, longitude })
      .returning();
    if (row && latitude && longitude) {
      const { CustomerLocationService } = await import('@/services/CustomerLocationService');
      await CustomerLocationService.createLocation({
        customerId: row.id,
        label: 'Główna',
        address: defaultAddress ?? null,
        latitude,
        longitude,
        isDefault: true,
        routeWaypoints: [],
      });
    }
    return row?.id;
  }

  static async updateCustomer(
    companyId: number,
    id: number,
    data: Partial<typeof customers.$inferInsert>,
  ) {
    await db
      .update(customers)
      .set(data)
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId)));
  }

  static async deleteCustomer(companyId: number, id: number) {
    await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId)));
  }
}
