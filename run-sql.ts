import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log("Migruje...");
  try {
     await db.execute(sql`CREATE TABLE IF NOT EXISTS resource_categories (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE)`);
     console.log("Stworzono tabele");
     await db.execute(sql`ALTER TABLE resources DROP COLUMN IF EXISTS type CASCADE`);
     console.log("Skasowano type");
     await db.execute(sql`ALTER TABLE resources ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES resource_categories(id) ON DELETE SET NULL`);
     console.log("Dodano categoryId");
  } catch(e) {
     console.error(e);
  }
}

migrate().then(() => process.exit(0));
