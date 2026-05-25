import { db } from '@/db';
import { resources, resourceToCategories } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { assertResourceCategoryAssignable } from '@/services/categoryHierarchyValidation';

export class ResourceService {
  static async getResources(companyId: number) {
    const allResources = await db
      .select()
      .from(resources)
      .where(eq(resources.companyId, companyId))
      .orderBy(desc(resources.id));
    const links = await db.select().from(resourceToCategories);
    const byResourceId = new Map<number, number[]>();
    for (const l of links) {
      const arr = byResourceId.get(l.resourceId) ?? [];
      arr.push(l.categoryId);
      byResourceId.set(l.resourceId, arr);
    }

    return allResources.map((r) => ({
      id: r.id,
      name: r.name,
      brand: r.brand ?? '',
      model: r.model ?? '',
      registrationNumber: r.registrationNumber ?? '',
      description: r.description ?? null,
      categoryIds: byResourceId.get(r.id) ?? [],
      imageUrl: r.imageUrl,
    }));
  }

  static async addResource(
    companyId: number,
    identity: {
      name: string;
      brand: string;
      model: string;
      registrationNumber: string;
      description?: string | null;
    },
    categoryIds: number[],
    imageUrl?: string | null,
  ) {
    const desc =
      identity.description != null && String(identity.description).trim() !== ''
        ? String(identity.description).trim().slice(0, 4000)
        : null;
    const res = await db
      .insert(resources)
      .values({
        companyId,
        name: identity.name.slice(0, 255),
        brand: identity.brand.slice(0, 120),
        model: identity.model.slice(0, 120),
        registrationNumber: identity.registrationNumber.slice(0, 32),
        description: desc,
        imageUrl: imageUrl ?? null,
      })
      .returning();
    if (categoryIds && categoryIds.length > 0) {
      for (const cid of categoryIds) {
        await assertResourceCategoryAssignable(cid, companyId);
      }
      await db.insert(resourceToCategories).values(
        categoryIds.map((cid) => ({
          resourceId: res[0].id,
          categoryId: cid,
        })),
      );
    }
  }

  static async updateResource(
    companyId: number,
    id: number,
    data: Partial<typeof resources.$inferInsert>,
    categoryIds?: number[],
  ) {
    const patch: Partial<typeof resources.$inferInsert> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.brand !== undefined) patch.brand = data.brand;
    if (data.model !== undefined) patch.model = data.model;
    if (data.registrationNumber !== undefined) patch.registrationNumber = data.registrationNumber;
    if (data.description !== undefined) patch.description = data.description;
    if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
    if (Object.keys(patch).length > 0) {
      await db
        .update(resources)
        .set(patch)
        .where(and(eq(resources.id, id), eq(resources.companyId, companyId)));
    }
    if (categoryIds !== undefined) {
      for (const cid of categoryIds) {
        await assertResourceCategoryAssignable(cid, companyId);
      }
      await db.delete(resourceToCategories).where(eq(resourceToCategories.resourceId, id));
      if (categoryIds.length > 0) {
        await db.insert(resourceToCategories).values(
          categoryIds.map((cid) => ({
            resourceId: id,
            categoryId: cid,
          })),
        );
      }
    }
  }

  static async deleteResource(companyId: number, id: number) {
    await db
      .delete(resources)
      .where(and(eq(resources.id, id), eq(resources.companyId, companyId)));
  }
}
