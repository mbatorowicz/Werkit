import { db } from './src/db/index.js';
import { resources, resourceCategories } from './src/db/schema.js';
import { eq, desc } from 'drizzle-orm';

async function test() {
  try {
    const allMachines = await db.select({
      id: resources.id,
      name: resources.name,
      categoryId: resources.categoryId,
      categoryName: resourceCategories.name
    })
    .from(resources)
    .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
    .orderBy(desc(resources.id));
    console.log("SUCCESS MACHINES:", allMachines);
  } catch(e) {
    console.log("ERROR MACHINES:", e);
  }

  try {
    const allCategories = await db.select().from(resourceCategories).orderBy(desc(resourceCategories.id));
    console.log("SUCCESS CATEGORIES:", allCategories);
  } catch(e) {
    console.log("ERROR CATEGORIES:", e);
  }
}

test();
