/**
 * Porównuje kolumny w PostgreSQL (information_schema) z kanoniczną listą
 * zsynchronizowaną z src/db/schema.ts + znane migracje drizzle / apply_*.
 *
 * Uruchom: npm run db:verify-schema
 *
 * Kod wyjścia: 0 = brak braków wymaganych kolumn, 1 = niedopasowanie lub brak połączenia.
 */
async function main() {
  const { loadEnvConfig } = await import('@next/env');
  loadEnvConfig(process.cwd());

  const { ensurePostgresUrlForVercelDriver } = await import('@/lib/resolveNeonPostgresUrl');
  if (!ensurePostgresUrlForVercelDriver()) {
    console.error('Brak DATABASE_URL / POSTGRES_URL — sprawdź .env.local');
    process.exit(1);
  }

  /** Nazwy kolumn w PG muszą odpowiadać definicjom w schema.ts (Drizzle snake_case). */
  const EXPECTED: Record<string, ReadonlySet<string>> = {
    users: new Set([
      'id',
      'full_name',
      'username_email',
      'password_hash',
      'role',
      'device_unique_id',
      'is_active',
      'can_create_own_orders',
      'notifications_enabled',
      'biometric_login_enabled',
      'can_edit_route',
    ]),
    resource_categories: new Set([
      'id',
      'name',
      'icon',
      'show_customer',
      'show_material',
      'show_quantity',
      'show_task_description',
      'show_resource_name',
      'show_resource_description',
      'show_registration_number',
      'req_customer',
      'req_material',
      'req_quantity',
      'req_task_description',
      'is_global',
      'is_stationary',
      'color',
    ]),
    resource_to_categories: new Set(['resource_id', 'category_id']),
    resources: new Set([
      'id',
      'name',
      'brand',
      'model',
      'registration_number',
      'description',
      'image_url',
    ]),
    materials: new Set(['id', 'name']),
    material_categories: new Set(['id', 'name', 'color']),
    material_to_categories: new Set(['material_id', 'category_id']),
    customers: new Set([
      'id',
      'first_name',
      'last_name',
      'default_address',
      'latitude',
      'longitude',
    ]),
    customer_locations: new Set([
      'id',
      'customer_id',
      'label',
      'address',
      'latitude',
      'longitude',
      'is_default',
      'sort_order',
      'route_waypoints',
    ]),
    work_sessions: new Set([
      'id',
      'work_order_id',
      'user_id',
      'resource_id',
      'category_id',
      'status',
      'start_time',
      'end_time',
      'quantity_tons',
      'material_id',
      'customer_id',
      'task_description',
      'machine_hours_photo_url',
      'signature_url',
      'client_absent',
      'expected_duration_hours',
      'due_date',
      'start_latitude',
      'start_longitude',
      'end_latitude',
      'end_longitude',
    ]),
    session_photos: new Set([
      'id',
      'work_session_id',
      'photo_url',
      'photo_type',
      'latitude',
      'longitude',
      'created_at',
    ]),
    gps_logs: new Set(['id', 'work_session_id', 'latitude', 'longitude', 'timestamp']),
    session_notes: new Set([
      'id',
      'work_session_id',
      'note',
      'latitude',
      'longitude',
      'created_at',
    ]),
    company_settings: new Set([
      'id',
      'company_name',
      'company_address',
      'zip_code',
      'city',
      'phone',
      'email',
      'base_latitude',
      'base_longitude',
      'cancel_window_minutes',
      'require_photo_to_finish',
      'geofence_radius_meters',
      'time_overrun_reminder',
      'upcoming_order_reminder_minutes',
    ]),
    work_orders: new Set([
      'id',
      'user_id',
      'resource_id',
      'category_id',
      'material_id',
      'customer_id',
      'customer_location_id',
      'task_description',
      'status',
      'created_at',
      'created_by_id',
      'quantity_tons',
      'expected_duration_hours',
      'priority',
      'due_date',
      'locked_until',
    ]),
    device_logs: new Set(['id', 'user_id', 'level', 'message', 'metadata', 'created_at']),
  };

  const { sql } = await import('@vercel/postgres');

  const { rows } = await sql<{ table_name: string; column_name: string }>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;

  const actualByTable = new Map<string, Set<string>>();
  for (const r of rows) {
    const t = r.table_name;
    const c = r.column_name;
    if (!actualByTable.has(t)) actualByTable.set(t, new Set());
    actualByTable.get(t)!.add(c);
  }

  let failed = false;
  const expectedTables = Object.keys(EXPECTED).sort();

  console.log('── Werkit: weryfikacja pokrycia kolumn DB ↔ schema.ts ──\n');

  for (const table of expectedTables) {
    const expectedCols = EXPECTED[table]!;
    const actualCols = actualByTable.get(table);
    if (!actualCols) {
      console.error(`[BRAK TABELI] ${table}`);
      failed = true;
      continue;
    }
    const missing = [...expectedCols].filter((c) => !actualCols.has(c));
    const extra = [...actualCols].filter((c) => !expectedCols.has(c));
    if (missing.length > 0) {
      console.error(`[${table}] Brak kolumn względem schema.ts: ${missing.join(', ')}`);
      failed = true;
    }
    if (extra.length > 0) {
      console.warn(`[${table}] Dodatkowe kolumny w DB (poza kanonem skryptu): ${extra.join(', ')}`);
    }
    if (missing.length === 0 && extra.length === 0) {
      console.log(`[OK] ${table}`);
    }
    if (missing.length === 0 && extra.length > 0) {
      console.log(`[OK] ${table} (z ostrzeżeniami o dodatkowych kolumnach)`);
    }
  }

  const unknownTablesWithCols = [...actualByTable.keys()]
    .filter((t) => !EXPECTED[t])
    .sort();
  if (unknownTablesWithCols.length > 0) {
    console.warn(
      `\n[WYKAZ] Tabele w public bez wpisu w kanonie skryptu (sprawdź ręcznie): ${unknownTablesWithCols.join(', ')}`,
    );
  }

  if (failed) {
    console.error('\nWynik: BŁĄD — uruchom npm run db:napraw-wszystko lub odpowiedni db:napraw-* .\n');
    process.exit(1);
  }

  console.log('\nWynik: OK — wymagane kolumny zgodne z src/db/schema.ts .\n');
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

export {};
