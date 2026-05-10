import { db } from '@/db';
import { resourceCategories, customers, materials, resources, companySettings, resourceToCategories } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export class DictionaryService {
  static async getCategories() {
    return await db.select().from(resourceCategories).orderBy(desc(resourceCategories.id));
  }

  static async getCustomers() {
    return await db.select().from(customers).orderBy(desc(customers.id));
  }

  static async getMaterials() {
    return await db.select().from(materials).orderBy(desc(materials.id));
  }

  static async getResources() {
    const allResources = await db.select().from(resources).orderBy(desc(resources.id));
    const links = await db.select().from(resourceToCategories);
    
    return allResources.map(r => {
      const cats = links.filter(l => l.resourceId === r.id).map(l => l.categoryId);
      return {
        id: r.id,
        name: r.name,
        categoryIds: cats,
        imageUrl: r.imageUrl
      };
    });
  }

  static async getSettings() {
    return await db.select().from(companySettings).limit(1);
  }

  // --- MATERIAŁY ---
  static async addMaterial(name: string, type: string) {
    await db.insert(materials).values({ name, type });
  }
  static async updateMaterial(id: number, data: Partial<typeof materials.$inferInsert>) {
    await db.update(materials).set(data).where(eq(materials.id, id));
  }
  static async deleteMaterial(id: number) {
    await db.delete(materials).where(eq(materials.id, id));
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
  static async addResource(name: string, categoryIds: number[], imageUrl?: string | null) {
    const res = await db.insert(resources).values({ name, imageUrl: imageUrl || null }).returning();
    if (categoryIds && categoryIds.length > 0) {
      await db.insert(resourceToCategories).values(categoryIds.map(cid => ({
        resourceId: res[0].id,
        categoryId: cid
      })));
    }
  }
  static async updateResource(id: number, data: Partial<typeof resources.$inferInsert>, categoryIds?: number[]) {
    await db.update(resources).set({ name: data.name, imageUrl: data.imageUrl }).where(eq(resources.id, id));
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
