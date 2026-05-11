/**
 * Musi załadować się przed `@vercel/postgres`: wtedy wystarczy DATABASE_URL z Neon zamiast duplikować POSTGRES_URL.
 */
import { loadEnvConfig } from '@next/env';
import { ensurePostgresUrlForVercelDriver } from '@/lib/resolveNeonPostgresUrl';

loadEnvConfig(process.cwd());
ensurePostgresUrlForVercelDriver();
