import { db } from '@/db';
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
import { eq, desc } from 'drizzle-orm';

export class DictionaryService {
  static async getCategories() {
    return await db.select().from(resourceCategories).orderBy(desc(resourceCategories.id));
  }

  static async getCustomers() {
    return await db.select().from(customers).orderBy(desc(customers.id));
  }

  static async getMaterials() {
    const all = await db.select().from(materials).orderBy(desc(materials.id));
    const links = await db.select().from(materialToCategories);
    return all.map((m) => ({
      id: m.id,
      name: m.name,
      categoryIds: links.filter((l) => l.materialId === m.id).map((l) => l.categoryId),
    }));
  }

  static async getMaterialCategories() {
    return await db.select().from(materialCategories).orderBy(desc(materialCategories.id));
  }

  static async getResources() {
    const allResources = await db.select().from(resources).orderBy(desc(resources.id));
    const links = await db.select().from(resourceToCategories);
    
    return allResources.map((r) => {
      const cats = links.filter((l) => l.resourceId === r.id).map((l) => l.categoryId);
      return {
        id: r.id,
        name: r.name,
        brand: r.brand ?? '',
        model: r.model ?? '',
        registrationNumber: r.registrationNumber ?? '',
        categoryIds: cats,
        imageUrl: r.imageUrl,
      };
    });
  }

  static async getSettings() {
    return await db.select().from(companySettings).limit(1);
  }

  // --- MATERIAŁY ---
  static async addMaterial(name: string, categoryIds: number[] = []) {
    const res = await db.insert(materials).values({ name }).returning();
    const mid = res[0].id;
    if (categoryIds.length > 0) {
      await db.insert(materialToCategories).values(
        categoryIds.map((cid) => ({ materialId: mid, categoryId: cid })),
      );
    }
  }

  static async updateMaterial(
    id: number,
    data: Partial<typeof materials.$inferInsert>,
    categoryIds?: number[],
  ) {
    await db.update(materials).set(data).where(eq(materials.id, id));
    if (categoryIds !== undefined) {
      await db.delete(materialToCategories).where(eq(materialToCategories.materialId, id));
      if (categoryIds.length > 0) {
        await db.insert(materialToCategories).values(
          categoryIds.map((cid) => ({ materialId: id, categoryId: cid })),
        );
      }
    }
  }

  static async deleteMaterial(id: number) {
    await db.delete(materials).where(eq(materials.id, id));
  }

  // --- KATEGORIE MATERIAŁÓW ---
  static async addMaterialCategory(data: { name: string; color?: string }) {
    await db.insert(materialCategories).values({
      name: data.name.trim(),
      color: data.color || '#3f3f46',
    });
  }

  static async updateMaterialCategory(id: number, data: Partial<typeof materialCategories.$inferInsert>) {
    await db.update(materialCategories).set(data).where(eq(materialCategories.id, id));
  }

  static async deleteMaterialCategory(id: number) {
    await db.delete(materialCategories).where(eq(materialCategories.id, id));
  }

  // --- KATEGORIE ZASOBÓW ---
  static async addCategory(data: Partial<typeof resourceCategories.$inferInsert>) {
    await db.insert(resourceCategories).values(data as typeof resourceCategories.$inferInsert);
  }
  static async updateCategory(id: number, data: Partial<typeof resourceCategories.$inferInsert>) {
    await db.update(resourceCategories).set(data).where(eq(resourceCategories.id, id));
  }
  static async deleteCategory(id: number) {
    await db.delete(resourceCategories).where(eq(resourceCategories.id, id));
  }

  static async getResourceCategoryById(id: number) {
    const rows = await db.select().from(resourceCategories).where(eq(resourceCategories.id, id)).limit(1);
    return rows[0] ?? null;
  }

  // --- KLIENCI ---
  static async addCustomer(firstName: string | null, lastName: string, defaultAddress?: string | null, latitude?: string | null, longitude?: string | null) {
    await db.insert(customers).values({ firstName, lastName, defaultAddress, latitude, longitude });
  }
  static async updateCustomer(id: number, data: Partial<typeof customers.$inferInsert>) {
    await db.update(customers).set(data).where(eq(customers.id, id));
  }
  static async deleteCustomer(id: number) {
    await db.delete(customers).where(eq(customers.id, id));
  }

  // --- ZASOBY (MASZYNY) ---
  static async addResource(
    identity: {
      name: string;
      brand: string;
      model: string;
      registrationNumber: string;
    },
    categoryIds: number[],
    imageUrl?: string | null,
  ) {
    const res = await db
      .insert(resources)
      .values({
        name: identity.name.slice(0, 255),
        brand: identity.brand.slice(0, 120),
        model: identity.model.slice(0, 120),
        registrationNumber: identity.registrationNumber.slice(0, 32),
        imageUrl: imageUrl ?? null,
      })
      .returning();
    if (categoryIds && categoryIds.length > 0) {
      await db.insert(resourceToCategories).values(
        categoryIds.map((cid) => ({
          resourceId: res[0].id,
          categoryId: cid,
        })),
      );
    }
  }
  static async updateResource(id: number, data: Partial<typeof resources.$inferInsert>, categoryIds?: number[]) {
    const patch: Partial<typeof resources.$inferInsert> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.brand !== undefined) patch.brand = data.brand;
    if (data.model !== undefined) patch.model = data.model;
    if (data.registrationNumber !== undefined) patch.registrationNumber = data.registrationNumber;
    if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
    if (Object.keys(patch).length > 0) {
      await db.update(resources).set(patch).where(eq(resources.id, id));
    }
    if (categoryIds !== undefined) {
      await db.delete(resourceToCategories).where(eq(resourceToCategories.resourceId, id));
      if (categoryIds.length > 0) {
        await db.insert(resourceToCategories).values(categoryIds.map(cid => ({
          resourceId: id,
          categoryId: cid
        })));
      }
    }
  }
  static async deleteResource(id: number) {
    await db.delete(resources).where(eq(resources.id, id));
  }

  // --- USTAWIENIA FIRMY ---
  static async updateSettings(updates: Partial<typeof companySettings.$inferInsert>) {
    await db.insert(companySettings)
      .values({ ...updates, id: 1 } as typeof companySettings.$inferInsert)
      .onConflictDoUpdate({
        target: companySettings.id,
        set: updates
      });
  }
}

/** Payload aktualizacji kategorii zasobów — do importu w Route Handlers bez `@/db/schema`. */
export type ResourceCategoryUpdateInput = Partial<typeof resourceCategories.$inferInsert>;

/** Payload aktualizacji kategorii materiałów — bez importu schematu w kontrolerze. */
export type MaterialCategoryUpdateInput = Partial<typeof materialCategories.$inferInsert>;
