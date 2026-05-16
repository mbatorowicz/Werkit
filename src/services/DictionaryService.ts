import { db } from '@/db';
import { isMissingResourceCategoriesVisibilityColumns } from '@/lib/postgresMigrationHints';
import {
  resourceCategories,
  customers,
  materials,
  materialCategories,
  materialToCategories,
  resources,
  companySettings,
  resourceToCategories,
} from '@/db/schema';
import { eq, asc, desc, inArray, and } from 'drizzle-orm';
import { filterCategoryLeaves } from '@/lib/categoryTree';
import {
  CategoryHierarchyError,
  assertMaterialCategoriesAssignable,
  assertResourceCategoryAssignable,
  countMaterialCategoryChildren,
  countResourceCategoryChildren,
  validateHierarchyPatch,
} from '@/services/categoryHierarchyValidation';

export class DictionaryService {
  /** Zapytanie bez `show_*` — działa na bazie sprzed migracji 0010. */
  private static async getCategoriesLegacyColumnsOnly(companyId: number) {
    return db
      .select({
        id: resourceCategories.id,
        name: resourceCategories.name,
        icon: resourceCategories.icon,
        reqCustomer: resourceCategories.reqCustomer,
        reqMaterial: resourceCategories.reqMaterial,
        reqQuantity: resourceCategories.reqQuantity,
        reqTaskDescription: resourceCategories.reqTaskDescription,
        isGlobal: resourceCategories.isGlobal,
        isStationary: resourceCategories.isStationary,
        color: resourceCategories.color,
      })
      .from(resourceCategories)
      .where(eq(resourceCategories.companyId, companyId))
      .orderBy(desc(resourceCategories.id));
  }

  static async getCategories(companyId: number, opts?: { leavesOnly?: boolean }) {
    let rows;
    try {
      rows = await db
        .select()
        .from(resourceCategories)
        .where(eq(resourceCategories.companyId, companyId))
        .orderBy(asc(resourceCategories.sortOrder), asc(resourceCategories.id));
    } catch (err: unknown) {
      if (!isMissingResourceCategoriesVisibilityColumns(err)) throw err;
      console.warn(
        'DictionaryService.getCategories: brak kolumn show_* na resource_categories — zapytanie legacy; uruchom migrację (npm run db:napraw-kategorie-widocznosc lub drizzle/0010).',
      );
      const legacy = await DictionaryService.getCategoriesLegacyColumnsOnly(companyId);
      rows = legacy.map((row) => ({
        ...row,
        companyId,
        parentId: null,
        isGroup: false,
        sortOrder: 0,
        showCustomer: true,
        showMaterial: true,
        showQuantity: true,
        showTaskDescription: true,
        showResourceName: true,
        showResourceDescription: false,
        showRegistrationNumber: true,
      }));
    }
    return opts?.leavesOnly ? filterCategoryLeaves(rows) : rows;
  }

  static async getCustomers(companyId: number) {
    return await db
      .select()
      .from(customers)
      .where(eq(customers.companyId, companyId))
      .orderBy(desc(customers.id));
  }

  static async getMaterials(companyId: number) {
    const all = await db
      .select()
      .from(materials)
      .where(eq(materials.companyId, companyId))
      .orderBy(desc(materials.id));
    const links = await db.select().from(materialToCategories);
    const byMaterialId = new Map<number, number[]>();
    for (const l of links) {
      const arr = byMaterialId.get(l.materialId) ?? [];
      arr.push(l.categoryId);
      byMaterialId.set(l.materialId, arr);
    }
    return all.map((m) => ({
      id: m.id,
      name: m.name,
      categoryIds: byMaterialId.get(m.id) ?? [],
    }));
  }

  static async getMaterialCategories(companyId: number, opts?: { leavesOnly?: boolean }) {
    const rows = await db
      .select()
      .from(materialCategories)
      .where(eq(materialCategories.companyId, companyId))
      .orderBy(asc(materialCategories.sortOrder), asc(materialCategories.id));
    return opts?.leavesOnly ? filterCategoryLeaves(rows) : rows;
  }

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

  /** Łączenie widoczności pól zasobu — pole widoczne, jeśli któraś z wybranych kategorii je pokazuje. */
  static async mergeResourceFormVisibility(
    companyId: number,
    categoryIds: number[],
  ): Promise<{
    showResourceName: boolean;
    showResourceDescription: boolean;
    showRegistrationNumber: boolean;
  }> {
    const ids = categoryIds.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) {
      return {
        showResourceName: true,
        showResourceDescription: true,
        showRegistrationNumber: true,
      };
    }
    const cats = await db
      .select({
        showResourceName: resourceCategories.showResourceName,
        showResourceDescription: resourceCategories.showResourceDescription,
        showRegistrationNumber: resourceCategories.showRegistrationNumber,
      })
      .from(resourceCategories)
      .where(
        and(
          eq(resourceCategories.companyId, companyId),
          inArray(resourceCategories.id, ids),
        ),
      );
    if (cats.length === 0) {
      return {
        showResourceName: true,
        showResourceDescription: true,
        showRegistrationNumber: true,
      };
    }
    return {
      showResourceName: cats.some((c) => c.showResourceName),
      showResourceDescription: cats.some((c) => c.showResourceDescription),
      showRegistrationNumber: cats.some((c) => c.showRegistrationNumber),
    };
  }

  static async getSettings(companyId: number) {
    return await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.companyId, companyId))
      .limit(1);
  }

  // --- MATERIAŁY ---
  static async addMaterial(companyId: number, name: string, categoryIds: number[] = []) {
    await assertMaterialCategoriesAssignable(categoryIds, companyId);
    const res = await db.insert(materials).values({ name, companyId }).returning();
    const mid = res[0].id;
    if (categoryIds.length > 0) {
      await db.insert(materialToCategories).values(
        categoryIds.map((cid) => ({ materialId: mid, categoryId: cid })),
      );
    }
  }

  static async updateMaterial(
    companyId: number,
    id: number,
    data: Partial<typeof materials.$inferInsert>,
    categoryIds?: number[],
  ) {
    await db
      .update(materials)
      .set(data)
      .where(and(eq(materials.id, id), eq(materials.companyId, companyId)));
    if (categoryIds !== undefined) {
      await assertMaterialCategoriesAssignable(categoryIds, companyId);
      await db.delete(materialToCategories).where(eq(materialToCategories.materialId, id));
      if (categoryIds.length > 0) {
        await db.insert(materialToCategories).values(
          categoryIds.map((cid) => ({ materialId: id, categoryId: cid })),
        );
      }
    }
  }

  static async deleteMaterial(companyId: number, id: number) {
    await db
      .delete(materials)
      .where(and(eq(materials.id, id), eq(materials.companyId, companyId)));
  }

  // --- KATEGORIE MATERIAŁÓW ---
  static async addMaterialCategory(
    companyId: number,
    data: Partial<typeof materialCategories.$inferInsert>,
  ) {
    const all = await DictionaryService.getMaterialCategories(companyId);
    validateHierarchyPatch(all, {
      parentId: data.parentId ?? null,
      isGroup: data.isGroup ?? false,
    });
    await db.insert(materialCategories).values({
      companyId,
      name: (data.name ?? '').trim(),
      color: data.color || '#3f3f46',
      parentId: data.parentId ?? null,
      isGroup: data.isGroup ?? false,
      sortOrder: data.sortOrder ?? 0,
    } as typeof materialCategories.$inferInsert);
  }

  static async updateMaterialCategory(
    companyId: number,
    id: number,
    data: Partial<typeof materialCategories.$inferInsert>,
  ) {
    const all = await DictionaryService.getMaterialCategories(companyId);
    validateHierarchyPatch(
      all,
      { parentId: data.parentId, isGroup: data.isGroup },
      id,
    );
    const self = all.find((r) => r.id === id);
    if (self?.isGroup && data.isGroup === false) {
      const childCount = await countMaterialCategoryChildren(id);
      if (childCount > 0) throw new CategoryHierarchyError('group_has_children');
    }
    await db
      .update(materialCategories)
      .set(data)
      .where(and(eq(materialCategories.id, id), eq(materialCategories.companyId, companyId)));
  }

  static async deleteMaterialCategory(companyId: number, id: number) {
    const childCount = await countMaterialCategoryChildren(id);
    if (childCount > 0) throw new CategoryHierarchyError('group_has_children');
    await db
      .delete(materialCategories)
      .where(and(eq(materialCategories.id, id), eq(materialCategories.companyId, companyId)));
  }

  // --- KATEGORIE ZASOBÓW ---
  static async addCategory(
    companyId: number,
    data: Partial<typeof resourceCategories.$inferInsert>,
  ) {
    const all = await DictionaryService.getCategories(companyId);
    validateHierarchyPatch(all, {
      parentId: data.parentId ?? null,
      isGroup: data.isGroup ?? false,
    });
    await db.insert(resourceCategories).values({
      ...data,
      companyId,
    } as typeof resourceCategories.$inferInsert);
  }

  static async updateCategory(
    companyId: number,
    id: number,
    data: Partial<typeof resourceCategories.$inferInsert>,
  ) {
    const all = await DictionaryService.getCategories(companyId);
    validateHierarchyPatch(
      all,
      { parentId: data.parentId, isGroup: data.isGroup },
      id,
    );
    const self = all.find((r) => r.id === id);
    if (self?.isGroup && data.isGroup === false) {
      const childCount = await countResourceCategoryChildren(id);
      if (childCount > 0) throw new CategoryHierarchyError('group_has_children');
    }
    await db
      .update(resourceCategories)
      .set(data)
      .where(and(eq(resourceCategories.id, id), eq(resourceCategories.companyId, companyId)));
  }

  static async deleteCategory(companyId: number, id: number) {
    const childCount = await countResourceCategoryChildren(id);
    if (childCount > 0) throw new CategoryHierarchyError('group_has_children');
    await db
      .delete(resourceCategories)
      .where(and(eq(resourceCategories.id, id), eq(resourceCategories.companyId, companyId)));
  }

  static async getResourceCategoryById(companyId: number, id: number) {
    const rows = await db
      .select()
      .from(resourceCategories)
      .where(and(eq(resourceCategories.id, id), eq(resourceCategories.companyId, companyId)))
      .limit(1);
    return rows[0] ?? null;
  }

  // --- KLIENCI ---
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

  // --- ZASOBY (MASZYNY) ---
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

  // --- USTAWIENIA FIRMY ---
  static async updateSettings(
    companyId: number,
    updates: Partial<typeof companySettings.$inferInsert>,
  ) {
    const { companyId: _omit, id: _id, ...rest } = updates;
    await db
      .insert(companySettings)
      .values({ ...rest, companyId } as typeof companySettings.$inferInsert)
      .onConflictDoUpdate({
        target: companySettings.companyId,
        set: rest,
      });
  }
}

export { CategoryHierarchyError } from '@/services/categoryHierarchyValidation';

/** Payload aktualizacji kategorii zasobów — do importu w Route Handlers bez `@/db/schema`. */
export type ResourceCategoryUpdateInput = Partial<typeof resourceCategories.$inferInsert>;

/** Payload aktualizacji kategorii materiałów — bez importu schematu w kontrolerze. */
export type MaterialCategoryUpdateInput = Partial<typeof materialCategories.$inferInsert>;
