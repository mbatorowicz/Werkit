/** Migracja 0012 — `resources.description` + widoczność pól zasobu na `resource_categories`. */
async function main() {
  const { loadEnvConfig } = await import('@next/env');
  loadEnvConfig(process.cwd());

  const { ensurePostgresUrlForVercelDriver } = await import('@/lib/resolveNeonPostgresUrl');
  if (!ensurePostgresUrlForVercelDriver()) {
    console.error('Brak DATABASE_URL / POSTGRES_URL w .env.local');
    process.exit(1);
  }

  const { sql } = await import('@vercel/postgres');

  await sql`ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "description" text`;
  await sql`ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_resource_name" boolean DEFAULT true NOT NULL`;
  await sql`ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_resource_description" boolean DEFAULT false NOT NULL`;
  await sql`ALTER TABLE "resource_categories" ADD COLUMN IF NOT EXISTS "show_registration_number" boolean DEFAULT true NOT NULL`;

  console.log('OK — resources.description + resource_categories.show_resource_* / show_registration_number (0012).');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

export {};
