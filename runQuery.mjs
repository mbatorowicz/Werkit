import { sql } from '@vercel/postgres';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  try {
    await sql`ALTER TABLE work_orders ADD COLUMN created_by_id INT REFERENCES users(id) ON DELETE SET NULL;`;
    console.log('Column added successfully.');
  } catch (e) {
    console.error(e);
  }
}
main();
