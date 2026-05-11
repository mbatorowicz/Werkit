/**
 * Tabele kategorii kruszyw (0005) + kolumna is_stationary na resource_categories (0007).
 * Uruchom: npm run db:napraw-slowniki-baza
 */
async function main() {
  const { loadEnvConfig } = await import('@next/env');
  loadEnvConfig(process.cwd());

  const { ensurePostgresUrlForVercelDriver } = await import('@/lib/resolveNeonPostgresUrl');
  if (!ensurePostgresUrlForVercelDriver()) {
    console.error('Brak DATABASE_URL / POSTGRES_URL w .env.local — patrz npm run db:napraw-maszyny (instrukcja).');
    process.exit(1);
  }

  const { sql } = await import('@vercel/postgres');

  console.log('Tworzenie tabel material_categories / material_to_categories (jeśli brak)…');
  await sql`
    CREATE TABLE IF NOT EXISTS "material_categories" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar(255) NOT NULL,
      "color" varchar(50) DEFAULT '#3f3f46'
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS "material_to_categories" (
      "material_id" integer NOT NULL,
      "category_id" integer NOT NULL,
      CONSTRAINT "material_to_categories_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "material_to_categories_category_id_material_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."material_categories"("id") ON DELETE cascade ON UPDATE no action,
      CONSTRAINT "material_to_categories_material_id_category_id_pk" PRIMARY KEY("material_id","category_id")
    )
  `;

  console.log('Kolumna is_stationary na resource_categories…');
  await sql`
    ALTER TABLE "resource_categories"
    ADD COLUMN IF NOT EXISTS "is_stationary" boolean DEFAULT false NOT NULL
  `;
  await sql`
    UPDATE "resource_categories"
    SET "is_stationary" = true
    WHERE upper(trim("name")) LIKE '%WARSZTAT%'
       OR upper(trim("name")) LIKE '%WORKSHOP%'
  `;

  console.log('OK — słowniki (kruszywa + mobilność typów sprzętu).');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

export {};
