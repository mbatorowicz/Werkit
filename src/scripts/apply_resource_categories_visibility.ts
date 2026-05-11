/**
 * Migracja `resource_categories.show_*` (drizzle 0010 + 0011).
 * Uruchom na produkcji / lokalnie: npm run db:napraw-kategorie-widocznosc
 */
async function main() {
  const { loadEnvConfig } = await import('@next/env');
  loadEnvConfig(process.cwd());

  const { ensurePostgresUrlForVercelDriver } = await import('@/lib/resolveNeonPostgresUrl');
  if (!ensurePostgresUrlForVercelDriver()) {
    console.error('Brak DATABASE_URL / POSTGRES_URL w .env.local');
    process.exit(1);
  }

  const { sql } = await import('@vercel/postgres');

  await sql`ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_customer" boolean DEFAULT true NOT NULL`;
  await sql`ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_material" boolean DEFAULT true NOT NULL`;
  await sql`ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_quantity" boolean DEFAULT true NOT NULL`;
  await sql`ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_task_description" boolean DEFAULT true NOT NULL`;

  await sql`
    UPDATE "resource_categories"
    SET "show_material" = true,
        "show_quantity" = true
    WHERE "is_stationary" = true
      AND "show_material" = false
      AND "show_quantity" = false
  `;

  console.log('OK — resource_categories: kolumny show_* (0010 + 0011).');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

export {};
