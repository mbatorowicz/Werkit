import { db } from "@/db";
import { resourceGroups, resources } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

export type ResourceGroupRow = {
  id: number;
  companyId: number;
  name: string;
  description: string | null;
  sortOrder: number;
  resourceCount?: number;
};

export class ResourceGroupService {
  static async getGroups(companyId: number): Promise<ResourceGroupRow[]> {
    const rows = await db
      .select({
        id: resourceGroups.id,
        companyId: resourceGroups.companyId,
        name: resourceGroups.name,
        description: resourceGroups.description,
        sortOrder: resourceGroups.sortOrder,
        resourceCount: sql<number>`count(${resources.id})::int`,
      })
      .from(resourceGroups)
      .leftJoin(resources, eq(resources.resourceGroupId, resourceGroups.id))
      .where(eq(resourceGroups.companyId, companyId))
      .groupBy(resourceGroups.id)
      .orderBy(asc(resourceGroups.sortOrder), asc(resourceGroups.id));

    return rows.map((r) => ({
      id: r.id,
      companyId: r.companyId,
      name: r.name,
      description: r.description,
      sortOrder: r.sortOrder,
      resourceCount: r.resourceCount ?? 0,
    }));
  }

  static async getGroup(companyId: number, id: number): Promise<ResourceGroupRow | null> {
    const [row] = await db
      .select()
      .from(resourceGroups)
      .where(and(eq(resourceGroups.id, id), eq(resourceGroups.companyId, companyId)))
      .limit(1);
    if (!row) return null;
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(resources)
      .where(eq(resources.resourceGroupId, id));
    return {
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      description: row.description,
      sortOrder: row.sortOrder,
      resourceCount: count ?? 0,
    };
  }

  static async addGroup(
    companyId: number,
    data: { name: string; description?: string | null; sortOrder?: number }
  ): Promise<number> {
    const res = await db
      .insert(resourceGroups)
      .values({
        companyId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning({ id: resourceGroups.id });
    return res[0].id;
  }

  static async updateGroup(
    companyId: number,
    id: number,
    data: { name?: string; description?: string | null; sortOrder?: number }
  ): Promise<void> {
    const patch: Partial<typeof resourceGroups.$inferInsert> = {};
    if (data.name !== undefined) patch.name = data.name.trim();
    if (data.description !== undefined) patch.description = data.description?.trim() || null;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (Object.keys(patch).length === 0) return;
    await db
      .update(resourceGroups)
      .set(patch)
      .where(and(eq(resourceGroups.id, id), eq(resourceGroups.companyId, companyId)));
  }

  static async deleteGroup(companyId: number, id: number): Promise<void> {
    await db
      .delete(resourceGroups)
      .where(and(eq(resourceGroups.id, id), eq(resourceGroups.companyId, companyId)));
  }
}
