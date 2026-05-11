import { defineConfig } from 'drizzle-kit';
import { loadEnvConfig } from '@next/env';
import { resolveNeonPostgresUrl } from './src/lib/resolveNeonPostgresUrl';

loadEnvConfig(process.cwd());

const databaseUrl = resolveNeonPostgresUrl();
if (!databaseUrl) {
  throw new Error(
    'Brak połączenia do bazy: w .env.local ustaw DATABASE_URL (skopiuj z Neon / Vercel — jeden gotowy connection string).',
  );
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
});
