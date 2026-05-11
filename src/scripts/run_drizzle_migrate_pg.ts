/**
 * Migracje Drizzle z katalogu `drizzle/` przez TCP (`pg`).
 *
 * **Produkcja bez historii `drizzle.__drizzle_migrations`:** schemat był składany skryptami `apply_*`.
 * Pełny `migrate()` od zera kończy się na `CREATE … already exists`. Ten skrypt:
 * - czyta `meta/_journal.json` + pliki `.sql` (jak Drizzle),
 * - pomija migracje, których `hash` już jest w `drizzle.__drizzle_migrations`,
 * - dla migracji **starszych niż 0013** (`folderMillis` < `when` z 0013): jeśli SQL rzuci typowym błędem „już na miejscu”, **tylko dopisuje hash** (baseline), bez przerywania,
 * - dla **0013 i 0014** błędy są propagowane (wymagana poprawna semantyka SQL).
 *
 * Preferuje połączenie **bez poolera**: `DATABASE_URL_UNPOOLED` / `POSTGRES_URL_NON_POOLING`.
 *
 * `npm run db:migrate:pg`
 */
import { loadEnvConfig } from '@next/env';
import pg from 'pg';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { resolveNeonPostgresUrl } from '@/lib/resolveNeonPostgresUrl';

function pickMigrateUrl(): string | undefined {
  const unpooled =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim();
  if (unpooled) return unpooled;
  return resolveNeonPostgresUrl();
}

/** `when` z journal dla `0013_work_orders_in_progress_status` — migracje z niższym `folderMillis` mogą być baseline-only przy konflikcie. */
const MILLIS_0013 = 1784349600000;

function isBaselineFriendlyPgError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const msg = String((err as Error).message || '');
  if (code === '42P07' || code === '42710' || code === '42701') return true;
  if (/already exists/i.test(msg)) return true;
  if (/duplicate key value/i.test(msg)) return true;
  return false;
}

async function ensureMigrationsTable(client: pg.PoolClient) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY NOT NULL,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function insertMigrationHash(client: pg.PoolClient, hash: string, createdAt: number) {
  await client.query(
    `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
     SELECT $1::text, $2::bigint
     WHERE NOT EXISTS (SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = $1)`,
    [hash, createdAt],
  );
}

async function loadAppliedHashes(client: pg.PoolClient): Promise<Set<string>> {
  const { rows } = await client.query<{ hash: string }>(
    `SELECT hash FROM "drizzle"."__drizzle_migrations"`,
  );
  return new Set(rows.map((r) => r.hash));
}

async function main() {
  loadEnvConfig(process.cwd());
  const url = pickMigrateUrl();
  if (!url) {
    console.error('Brak connection stringa (DATABASE_URL_UNPOOLED lub DATABASE_URL / POSTGRES_URL).');
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: url,
    ssl: url.includes('neon.tech') || url.includes('sslmode=require') ? { rejectUnauthorized: true } : undefined,
    max: 1,
  });

  const migrationsFolder = 'drizzle';
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await loadAppliedHashes(client);
    const migrations = readMigrationFiles({ migrationsFolder });

    for (const m of migrations) {
      if (applied.has(m.hash)) continue;

      const allowBaselineOnly = m.folderMillis < MILLIS_0013;

      await client.query('BEGIN');
      try {
        for (const chunk of m.sql) {
          const stmt = chunk.trim();
          if (stmt.length === 0) continue;
          await client.query(stmt);
        }
        await client.query(
          `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)`,
          [m.hash, m.folderMillis],
        );
        await client.query('COMMIT');
        applied.add(m.hash);
        console.log(`[OK] migracja created_at=${m.folderMillis}`);
      } catch (err) {
        await client.query('ROLLBACK');
        if (allowBaselineOnly && isBaselineFriendlyPgError(err)) {
          await insertMigrationHash(client, m.hash, m.folderMillis);
          applied.add(m.hash);
          console.warn(
            `[BASELINE] Pominięto SQL (schemat już obecny), dopisano hash created_at=${m.folderMillis}: ${(err as Error).message}`,
          );
          continue;
        }
        throw err;
      }
    }
    console.log('OK — migracje Drizzle zsynchronizowane z bazą.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
