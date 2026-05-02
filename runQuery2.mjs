import { sql } from '@vercel/postgres';

async function main() {
  try {
    await sql`ALTER TABLE work_orders ADD COLUMN priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL';`;
    console.log('Priority added.');
  } catch (e) {
    console.error(e);
  }
}
main();
