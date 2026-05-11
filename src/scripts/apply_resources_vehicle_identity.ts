/**
 * Jednorazowa naprawa tabeli „resources” (maszyny w panelu admin).
 * Uruchom: npm run db:napraw-maszyny
 *
 * W `.env.local` wystarczy wkleić z Neon jedną linię DATABASE_URL (reszta nazw zmiennych jest opcjonalna).
 */
async function main() {
  const { loadEnvConfig } = await import('@next/env');
  loadEnvConfig(process.cwd());

  const { ensurePostgresUrlForVercelDriver } = await import(
    '@/lib/resolveNeonPostgresUrl'
  );

  console.log('');
  console.log('── Werkit: naprawa bazy — lista maszyn ──');
  console.log('');

  if (!ensurePostgresUrlForVercelDriver()) {
    console.error(
      'Nie znaleziono połączenia do bazy.\n\n',
      'Zrób tak:\n',
      '  1) Zaloguj się do Neon (albo Vercel → Storage → baza).\n',
      '  2) Skopiuj „Connection string” (zwykle zaczyna się od postgresql://).\n',
      '  3) Wklej go w pliku .env.local w pierwszej linii:\n',
      '       DATABASE_URL=wklej_tutaj_skopiowany_connection_string\n',
      '  4) Zapisz plik i uruchom ponownie: npm run db:napraw-maszyny\n',
    );
    process.exit(1);
  }

  console.log('Łączenie z bazą…');

  const { sql } = await import('@vercel/postgres');

  console.log('Dopisywanie brakujących kolumn (marka, model, nr rej.)…');

  await sql`
    ALTER TABLE "resources"
    ADD COLUMN IF NOT EXISTS "brand" varchar(120) DEFAULT '' NOT NULL
  `;
  await sql`
    ALTER TABLE "resources"
    ADD COLUMN IF NOT EXISTS "model" varchar(120) DEFAULT '' NOT NULL
  `;
  await sql`
    ALTER TABLE "resources"
    ADD COLUMN IF NOT EXISTS "registration_number" varchar(32) DEFAULT '' NOT NULL
  `;

  console.log('');
  console.log('OK — baza jest na miejscu.');
  console.log('Odśwież stronę „Flota i pojazdy” w przeglądarce.');
  console.log('');
}

void main().catch((err: unknown) => {
  console.error('');
  console.error('Połączenie lub zmiana w bazie się nie udała.');
  console.error('Jeśli widzisz błąd poniżej, wyślij go osobie od IT — bez hasła z .env.');
  console.error(err);
  console.error('');
  process.exit(1);
});

export {};
