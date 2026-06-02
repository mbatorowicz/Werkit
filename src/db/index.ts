/**
 * Połączenie z bazą: `env` ustawia POSTGRES_URL z DATABASE_URL (Neon), potem Drizzle + `pg` Pool.
 *
 * Używa `drizzle-orm/node-postgres` z `pg` Pool zamiast `@vercel/postgres` (który wymaga PgBouncer).
 * Powód: PgBouncer na Neon bywa chwilowo niedostępny (ECONNREFUSED).
 * `pg` Pool łączy się bezpośrednio (unpooled endpoint) — bardziej niezawodne.
 *
 * Pool utrzymuje stałe połączenia, więc nie ma narzutu na nawiązywanie nowego
 * połączenia przy każdym żądaniu (w przeciwieństwie do `createClient()` z `@vercel/postgres`).
 *
 * Inicjalizacja jest **leniwa** — pool i drizzle powstają dopiero przy pierwszym
 * dostępie do `db` / `pool`. Dzięki temu `next build` może zaimportować moduł
 * bez connection stringa (np. przy zbieraniu page data), a błąd pojawi się
 * dopiero przy próbie wykonania zapytania.
 */
import "@/db/env";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

function getConnectionString(): string {
  // Kolejność: POSTGRES_URL_NON_POOLING (unpooled) > POSTGRES_URL > DATABASE_URL
  return (
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

let _pool: Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

function ensureInitialized(): { pool: Pool; db: NodePgDatabase<typeof schema> } {
  if (_db && _pool) return { pool: _pool, db: _db };

  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error(
      "Brak connection stringa — ustaw POSTGRES_URL_NON_POOLING, POSTGRES_URL lub DATABASE_URL w .env.local"
    );
  }

  _pool = new Pool({
    connectionString,
    max: 10, // maksymalna liczba połączeń w puli
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  _db = drizzle(_pool, { schema });
  return { pool: _pool, db: _db };
}

/**
 * Leniwy proxy — przekazuje wszystkie operacje do prawdziwego `db`,
 * który powstaje dopiero przy pierwszym dostępie.
 */
export const db: NodePgDatabase<typeof schema> = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const { db: realDb } = ensureInitialized();
    return Reflect.get(realDb, prop, receiver);
  },
});

/** Leniwy eksport poola — inicjalizacja przy pierwszym dostępie. */
export const pool: Pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const { pool: realPool } = ensureInitialized();
    return Reflect.get(realPool, prop, receiver);
  },
});
