import { db } from '../db';
import { resourceCategories, resources, resourceToCategories, workSessions, workOrders } from '../db/schema';
import { eq, isNotNull } from 'drizzle-orm';

async function migrate() {
  console.log("Starting DB migration...");

  // 1. Ensure categories exist based on sessionType
  const typeMap: Record<string, string> = {
    'TRANSPORT': 'Transport',
    'MACHINE_OP': 'Praca Maszyny',
    'WORKSHOP': 'Warsztat'
  };

  const categoryIds: Record<string, number> = {};

  const existingCategories = await db.select().from(resourceCategories);
  
  for (const [key, name] of Object.entries(typeMap)) {
    let cat = existingCategories.find(c => c.name.toUpperCase() === key || c.name.toUpperCase() === name.toUpperCase());
    if (!cat) {
      console.log(`Creating category ${name}...`);
      const inserted = await db.insert(resourceCategories).values({
        name,
        reqCustomer: key === 'TRANSPORT',
        reqMaterial: key === 'TRANSPORT',
        reqQuantity: key === 'TRANSPORT',
        reqTaskDescription: key !== 'TRANSPORT',
        isGlobal: key === 'WORKSHOP', // As discussed
      }).returning();
      cat = inserted[0];
    }
    categoryIds[key] = cat.id;
  }

  // 2. Migrate existing resources to resourceToCategories
  console.log("Migrating resource categories...");
  const existingResources = await db.select().from(resources).where(isNotNull(resources.categoryId));
  for (const res of existingResources) {
    if (res.categoryId) {
      // Check if link exists
      const existingLink = await db.select().from(resourceToCategories).where(
        eq(resourceToCategories.resourceId, res.id)
      );
      // We don't have a direct eq(a, b) AND eq(c, d) easily without importing `and`, so let's just insert if empty
      const hasLink = existingLink.some(l => l.categoryId === res.categoryId);
      if (!hasLink) {
        await db.insert(resourceToCategories).values({
          resourceId: res.id,
          categoryId: res.categoryId
        });
      }
    }
  }

  // 3. Migrate workSessions
  console.log("Migrating workSessions...");
  const sessions = await db.select().from(workSessions);
  for (const s of sessions) {
    if (s.sessionType && categoryIds[s.sessionType]) {
      await db.update(workSessions)
        .set({ categoryId: categoryIds[s.sessionType] })
        .where(eq(workSessions.id, s.id));
    }
  }

  // 4. Migrate workOrders
  console.log("Migrating workOrders...");
  const orders = await db.select().from(workOrders);
  for (const o of orders) {
    if (o.sessionType && categoryIds[o.sessionType]) {
      await db.update(workOrders)
        .set({ categoryId: categoryIds[o.sessionType] })
        .where(eq(workOrders.id, o.id));
    }
  }

  console.log("Migration complete!");
}

migrate().catch(console.error);
