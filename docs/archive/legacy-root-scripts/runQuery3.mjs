import { sql } from '@vercel/postgres';

async function main() {
  try {
    await sql`ALTER TABLE resource_categories ADD COLUMN icon VARCHAR(50) DEFAULT 'Truck';`;
    console.log('Icon column added.');
  } catch (e) {
    console.error(e);
  }
}
main();
