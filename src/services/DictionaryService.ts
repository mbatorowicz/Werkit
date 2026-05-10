import { db } from '@/db';
import { resourceCategories, customers, materials, resources, companySettings } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export class DictionaryService {
  static async getCategories() {
    return await db.select().from(resourceCategories).orderBy(resourceCategories.name);
  }

  static async getCustomers() {
    return await db.select().from(customers).orderBy(desc(customers.id));
  }

  static async getMaterials() {
    return await db.select().from(materials).orderBy(desc(materials.id));
  }

  static async getResources() {
    return await db.select().from(resources).orderBy(desc(resources.id));
  }

  static async getSettings() {
    return await db.select().from(companySettings).limit(1);
  }
}
