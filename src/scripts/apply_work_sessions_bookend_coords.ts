/** Migracja drizzle/0008 — snapshot GPS przy starcie i końcu sesji. Uruchom: npm run db:napraw-lokalizacja-sesji */
async function main() {
  const { loadEnvConfig } = await import('@next/env');
  loadEnvConfig(process.cwd());

  const { ensurePostgresUrlForVercelDriver } = await import('@/lib/resolveNeonPostgresUrl');
  if (!ensurePostgresUrlForVercelDriver()) {
    console.error('Brak DATABASE_URL / POSTGRES_URL w .env.local');
    process.exit(1);
  }

  const { sql } = await import('@vercel/postgres');

  await sql`ALTER TABLE "work_sessions" ADD COLUMN IF NOT EXISTS "start_latitude" numeric(10, 8)`;
  await sql`ALTER TABLE "work_sessions" ADD COLUMN IF NOT EXISTS "start_longitude" numeric(11, 8)`;
  await sql`ALTER TABLE "work_sessions" ADD COLUMN IF NOT EXISTS "end_latitude" numeric(10, 8)`;
  await sql`ALTER TABLE "work_sessions" ADD COLUMN IF NOT EXISTS "end_longitude" numeric(11, 8)`;

  console.log('OK — work_sessions: start/end latitude & longitude.');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

export {};
