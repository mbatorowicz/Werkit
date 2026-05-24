const { db } = require('@vercel/postgres');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = await db.connect();
  try {
    await client.query('ALTER TABLE work_orders ADD COLUMN quantity_tons numeric(10,2);');
    await client.query('ALTER TABLE work_orders ADD COLUMN expected_duration_hours numeric(5,2);');
    console.log('Migration successful');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
  }
}
main();
