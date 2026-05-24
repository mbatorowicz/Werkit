import { sql } from '@vercel/postgres';


async function main() {
  try {
    await sql`ALTER TABLE work_orders ADD COLUMN quantity_tons numeric(10,2);`;
    await sql`ALTER TABLE work_orders ADD COLUMN expected_duration_hours numeric(5,2);`;
    console.log('Column added successfully.');
  } catch (e) {
    console.error(e);
  }
}
main();
