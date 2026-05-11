/**
 * Typowy eksport Neon / integracji Vercel Postgres — wiele nazw zmiennych z tym samym sensem.
 * Nie loguj zwracanej wartości (sekret).
 */
function trim(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t || undefined;
}

/** Pierwszy dostępny connection string (kolejność jak w dashboardzie Vercel / Neon). */
export function resolveNeonPostgresUrl(): string | undefined {
  const direct =
    trim(process.env.POSTGRES_URL) ||
    trim(process.env.DATABASE_URL) ||
    trim(process.env.DATABASE_URL_UNPOOLED) ||
    trim(process.env.POSTGRES_URL_NON_POOLING) ||
    trim(process.env.POSTGRES_PRISMA_URL) ||
    trim(process.env.POSTGRES_URL_NO_SSL);

  if (direct) return direct;

  const host =
    trim(process.env.PGHOST) ||
    trim(process.env.POSTGRES_HOST) ||
    trim(process.env.PGHOST_UNPOOLED);
  const user = trim(process.env.PGUSER) ?? trim(process.env.POSTGRES_USER);
  const password = process.env.PGPASSWORD ?? process.env.POSTGRES_PASSWORD;
  const database =
    trim(process.env.PGDATABASE) ?? trim(process.env.POSTGRES_DATABASE);

  if (!host || !user || password === undefined || password === '' || !database) {
    return undefined;
  }

  const encUser = encodeURIComponent(user);
  const encPass = encodeURIComponent(password);
  const ssl = host.includes('neon.tech') ? '?sslmode=require' : '';

  return `postgresql://${encUser}:${encPass}@${host}/${database}${ssl}`;
}

/**
 * `@vercel/postgres` oczekuje `POSTGRES_URL`; ustawia ją z innych nazw, jeśli trzeba.
 */
export function ensurePostgresUrlForVercelDriver(): boolean {
  const url = resolveNeonPostgresUrl();
  if (!url) return false;
  process.env.POSTGRES_URL = url;
  return true;
}
