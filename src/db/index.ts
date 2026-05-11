/** Połączenie z bazą: `env` ustawia POSTGRES_URL z DATABASE_URL (Neon), potem Drizzle + `@vercel/postgres`. */
import '@/db/env';
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema';

// Export the db client to be used across the app
export const db = drizzle(sql, { schema });
