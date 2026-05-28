/**
 * Połączenie z bazą: `env` ustawia POSTGRES_URL z DATABASE_URL (Neon), potem Drizzle + `pg` Pool.
 *
 * Używa `drizzle-orm/node-postgres` z `pg` Pool zamiast `@vercel/postgres` (który wymaga PgBouncer).
 * Powód: PgBouncer na Neon bywa chwilowo niedostępny (ECONNREFUSED).
 * `pg` Pool łączy się bezpośrednio (unpooled endpoint) — bardziej niezawodne.
 *
 * Pool utrzymuje stałe połączenia, więc nie ma narzutu na nawiązywanie nowego
 * połączenia przy każdym żądaniu (w przeciwieństwie do `createClient()` z `@vercel/postgres`).
 */
import '@/db/env';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

function getConnectionString(): string {
  // Kolejność: POSTGRES_URL_NON_POOLING (unpooled) > POSTGRES_URL > DATABASE_URL
  return (
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ''
  );
}

const connectionString = getConnectionString();

if (!connectionString) {
  throw new Error(
    'Brak connection stringa — ustaw POSTGRES_URL_NON_POOLING, POSTGRES_URL lub DATABASE_URL w .env.local',
  );
}

const pool = new Pool({
  connectionString,
  max: 10, // maksymalna liczba połączeń w puli
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Export the db client to be used across the app
export const db = drizzle(pool, { schema });

// Eksportuj surowy pool na wypadek potrzeby bezpośrednich zapytań
export { pool };
