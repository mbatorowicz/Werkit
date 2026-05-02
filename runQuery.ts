import { sql } from '@vercel/postgres';

async function main() {
  try {
    await sql`ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS created_by_id INT REFERENCES users(id) ON DELETE SET NULL;`;
    console.log('Column added successfully.');
  } catch (e) {
    console.error(e);
  }
}
main();
