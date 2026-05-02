import { db } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating work_orders table...');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS work_orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      resource_id INTEGER NOT NULL REFERENCES resources(id) ON DELETE SET NULL,
      session_type VARCHAR(50) NOT NULL,
      material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      task_description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
  console.log('work_orders table created successfully!');
}

main().catch(console.error).then(() => process.exit(0));
