/** Migracja drizzle/0009 — usuwa kolumnę `materials.type` (klasyfikacja tylko przez kategorie). Uruchom: npm run db:napraw-materialy-bez-typu */
async function main() {
  const { loadEnvConfig } = await import('@next/env');
  loadEnvConfig(process.cwd());

  const { ensurePostgresUrlForVercelDriver } = await import('@/lib/resolveNeonPostgresUrl');
  if (!ensurePostgresUrlForVercelDriver()) {
    console.error('Brak DATABASE_URL / POSTGRES_URL w .env.local');
    process.exit(1);
  }

  const { sql } = await import('@vercel/postgres');
  await sql`ALTER TABLE "materials" DROP COLUMN IF EXISTS "type"`;
  console.log('OK — materials: kolumna type usunięta.');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

export {};
