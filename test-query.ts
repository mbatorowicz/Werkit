import { db } from './src/db';
import { resources, resourceCategories } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    const data = await db.select().from(resources).leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id));
    console.log('Success:', data.length);
  } catch(e) {
    console.error('Error:', e);
  }
}
main();
