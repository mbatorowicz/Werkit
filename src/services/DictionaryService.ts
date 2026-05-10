import { db } from '@/db';
import { resourceCategories, customers, materials, resources, companySettings } from '@/db/schema';
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
    return await db.select({
      id: resources.id,
      name: resources.name,
      categoryId: resources.categoryId,
      categoryName: resourceCategories.name
    })
    .from(resources)
    .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
    .orderBy(desc(resources.id));
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
  static async addCategory(name: string, icon: string) {
    await db.insert(resourceCategories).values({ name, icon });
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
  static async addResource(name: string, categoryId: number) {
    await db.insert(resources).values({ name, categoryId });
  }
  static async updateResource(id: number, data: Partial<typeof resources.$inferInsert>) {
    await db.update(resources).set(data).where(eq(resources.id, id));
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
