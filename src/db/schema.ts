/**
 * SSOT struktury tabel dla Drizzle. Porównanie z faktyczną bazą: `npm run db:verify-schema`
 * (kanoniczna lista kolumn w `src/scripts/verify_schema_alignment.ts` — przy zmianach tu aktualizuj i tam).
 * Dokumentacja biznesowa i migracji: `docs/SYSTEM_MAP.md` §3; zasady autonomicznych migracji: `AGENTS.md` §1a.
 */
import { pgTable, serial, varchar, text, timestamp, boolean, integer, numeric, json, jsonb, primaryKey, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/** Tenant (firma) — izolacja danych multi-firm. */
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  /** NULL tylko dla roli platformowej `superadmin`. */
  companyId: integer('company_id').references(() => companies.id, { onDelete: 'restrict' }),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  usernameEmail: varchar('username_email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('worker'), // superadmin | admin | worker | viewer
  deviceUniqueId: varchar('device_unique_id', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  canCreateOwnOrders: boolean('can_create_own_orders').notNull().default(true),
  notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
  /** Pracownik włączył logowanie biometryczne na urządzeniu (preferencja konta + secure storage). */
  biometricLoginEnabled: boolean('biometric_login_enabled').notNull().default(false),
  /** Czy pracownik może edytować zaplanowaną trasę dojazdu (punkty pośrednie) w terenie. */
  canEditRoute: boolean('can_edit_route').notNull().default(false),
  /** Czy pracownik może dodawać kontrahentów (np. w kreatorze zlecenia własnego). */
  canCreateCustomers: boolean('can_create_customers').notNull().default(false),
  /** Pracownik DUR (Dział Utrzymania Ruchu) — widzi zlecenia naprawcze i magazyn części. */
  isDurWorker: boolean('is_dur_worker').notNull().default(false),
});

export const resourceCategories = pgTable('resource_categories', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: integer('parent_id').references((): AnyPgColumn => resourceCategories.id, { onDelete: 'set null' }),
  /** Grupa organizacyjna — nie wybierana na zleceniach ani w wizardzie. */
  isGroup: boolean('is_group').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  icon: varchar('icon', { length: 50 }).default('Truck'),
  /** Widoczność pól w formularzach zlecenia (UI). */
  showCustomer: boolean('show_customer').notNull().default(true),
  showMaterial: boolean('show_material').notNull().default(true),
  showQuantity: boolean('show_quantity').notNull().default(true),
  showTaskDescription: boolean('show_task_description').notNull().default(true),
  /** Widoczność pól przy dodawaniu zasobu przypisanego do tej kategorii (marka/model, opis, nr rej.). */
  showResourceName: boolean('show_resource_name').notNull().default(true),
  showResourceDescription: boolean('show_resource_description').notNull().default(false),
  showRegistrationNumber: boolean('show_registration_number').notNull().default(true),
  /** Wymagalność pól w formularzach (walidacja). */
  reqCustomer: boolean('req_customer').notNull().default(false),
  reqMaterial: boolean('req_material').notNull().default(false),
  reqQuantity: boolean('req_quantity').notNull().default(false),
  reqTaskDescription: boolean('req_task_description').notNull().default(true),
  isGlobal: boolean('is_global').notNull().default(false),
  /** Warsztat / załadunek na placu — bez śledzenia trasy GPS i bez geofencingu „dojazdu”. */
  isStationary: boolean('is_stationary').notNull().default(false),
  color: varchar('color', { length: 50 }).default('#3f3f46'),
  /** Rodzaj zlecenia: machine_work (praca na maszynie, z materiałami) | machine_repair (naprawa, z częściami). */
  orderType: varchar('order_type', { length: 50 }).notNull().default('machine_work'),
});

export const resourceToCategories = pgTable('resource_to_categories', {
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => resourceCategories.id, { onDelete: 'cascade' }),
});

export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  /** Wyświetlana nazwa (składana z marki / modelu / nr rej.; pole dla kompatybilności w zapytaniach). */
  name: varchar('name', { length: 255 }).notNull(),
  brand: varchar('brand', { length: 120 }).notNull().default(''),
  model: varchar('model', { length: 120 }).notNull().default(''),
  registrationNumber: varchar('registration_number', { length: 32 }).notNull().default(''),
  /** Opcjonalny opis zasobu (np. lokalizacja, warsztat — nie tylko pojazd). */
  description: text('description'),
  imageUrl: text('image_url'),
});

export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
});

/** Kategorie materiałów (słownik) — analogicznie do kategorii maszyn. */
export const materialCategories = pgTable('material_categories', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: integer('parent_id').references((): AnyPgColumn => materialCategories.id, { onDelete: 'set null' }),
  isGroup: boolean('is_group').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  color: varchar('color', { length: 50 }).default('#3f3f46'),
});

export const materialToCategories = pgTable(
  'material_to_categories',
  {
    materialId: integer('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => materialCategories.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.materialId, t.categoryId] }),
  }),
);

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  defaultAddress: text('default_address'),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
});

/** Lokalizacje klienta (wiele adresów) + zaplanowana trasa dojazdu (punkty pośrednie w JSON). */
export const customerLocations = pgTable('customer_locations', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 255 }).notNull().default('Główna'),
  address: text('address'),
  latitude: numeric('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: numeric('longitude', { precision: 11, scale: 8 }).notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  /** Tablica `{ lat, lng }[]` — punkty pośrednie (bez punktu docelowego). */
  routeWaypoints: jsonb('route_waypoints').notNull().default([]),
});

export const workSessions = pgTable('work_sessions', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  workOrderId: integer('work_order_id').references(() => workOrders.id, { onDelete: 'set null' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'set null' }),
  categoryId: integer('category_id').references(() => resourceCategories.id, { onDelete: 'set null' }), // New link to classifier
  status: varchar('status', { length: 50 }).notNull().default('IN_PROGRESS'),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  quantityTons: numeric('quantity_tons', { precision: 10, scale: 2 }),
  materialId: integer('material_id').references(() => materials.id, { onDelete: 'set null' }),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  taskDescription: text('task_description'),
  machineHoursPhotoUrl: text('machine_hours_photo_url'),
  signatureUrl: text('signature_url'),
  clientAbsent: boolean('client_absent').default(false),
  expectedDurationHours: numeric('expected_duration_hours', { precision: 5, scale: 2 }),
  dueDate: timestamp('due_date'),
  /** Snapshot GPS w momencie startu (akceptacja zlecenia / kreator). */
  startLatitude: numeric('start_latitude', { precision: 10, scale: 8 }),
  startLongitude: numeric('start_longitude', { precision: 11, scale: 8 }),
  /** Snapshot GPS przy zakończeniu sesji. */
  endLatitude: numeric('end_latitude', { precision: 10, scale: 8 }),
  endLongitude: numeric('end_longitude', { precision: 11, scale: 8 }),
  /** Rodzaj zlecenia: machine_work (praca na maszynie, z materiałami) | machine_repair (naprawa, z częściami). */
  orderType: varchar('order_type', { length: 50 }).notNull().default('machine_work'),
  /** Opis usterki — tylko dla order_type = 'machine_repair'. */
  repairDescription: text('repair_description'),
  /** Notatki serwisowe po naprawie — tylko dla order_type = 'machine_repair'. */
  repairNotes: text('repair_notes'),
});

export const sessionPhotos = pgTable('session_photos', {
  id: serial('id').primaryKey(),
  workSessionId: integer('work_session_id').notNull().references(() => workSessions.id, { onDelete: 'cascade' }),
  photoUrl: text('photo_url').notNull(),
  photoType: varchar('photo_type', { length: 50 }).notNull(), // START, END, AD_HOC
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const gpsLogs = pgTable('gps_logs', {
  id: serial('id').primaryKey(),
  workSessionId: integer('work_session_id').notNull().references(() => workSessions.id, { onDelete: 'cascade' }),
  latitude: numeric('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: numeric('longitude', { precision: 11, scale: 8 }).notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
});

export const sessionNotes = pgTable('session_notes', {
  id: serial('id').primaryKey(),
  workSessionId: integer('work_session_id').notNull().references(() => workSessions.id, { onDelete: 'cascade' }),
  note: text('note').notNull(),
  latitude: numeric('latitude', { precision: 10, scale: 8 }),
  longitude: numeric('longitude', { precision: 11, scale: 8 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const companySettings = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' })
    .unique(),
  companyName: varchar('company_name', { length: 255 }).notNull().default('Werkit ERP'),
  companyAddress: text('company_address'),
  zipCode: varchar('zip_code', { length: 20 }),
  city: varchar('city', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  baseLatitude: numeric('base_latitude', { precision: 10, scale: 8 }),
  baseLongitude: numeric('base_longitude', { precision: 11, scale: 8 }),
  cancelWindowMinutes: integer('cancel_window_minutes').notNull().default(5),
  requirePhotoToFinish: boolean('require_photo_to_finish').notNull().default(false),
  geofenceRadiusMeters: integer('geofence_radius_meters').notNull().default(500),
  timeOverrunReminder: boolean('time_overrun_reminder').notNull().default(true),
  upcomingOrderReminderMinutes: integer('upcoming_order_reminder_minutes').notNull().default(120),
  /** Flagi funkcji — przełączane przez superadmina per organizacja. */
  gpsTrackingEnabled: boolean('gps_tracking_enabled').notNull().default(true),
  mapViewEnabled: boolean('map_view_enabled').notNull().default(true),
  geofencingEnabled: boolean('geofencing_enabled').notNull().default(true),
  routePlanningEnabled: boolean('route_planning_enabled').notNull().default(true),
  navigationEnabled: boolean('navigation_enabled').notNull().default(true),
  /** Moduł DUR (części zamienne, magazyn) — domyślnie wyłączony. */
  durEnabled: boolean('dur_enabled').notNull().default(false),
});

export const workOrders = pgTable('work_orders', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'set null' }),
  categoryId: integer('category_id').references(() => resourceCategories.id, { onDelete: 'set null' }), // New link to classifier
  materialId: integer('material_id').references(() => materials.id, { onDelete: 'set null' }),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  customerLocationId: integer('customer_location_id').references(() => customerLocations.id, { onDelete: 'set null' }),
  taskDescription: text('task_description'),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING | IN_PROGRESS (powiązana sesja aktywna) | COMPLETED | CANCELLED
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  quantityTons: numeric('quantity_tons', { precision: 10, scale: 2 }),
  expectedDurationHours: numeric('expected_duration_hours', { precision: 5, scale: 2 }),
  /** Dozwolone wartości: URGENT | HIGH | NORMAL | LOW — egzekwowane przez CHECK `work_orders_priority_chk` (migracja drizzle). */
  priority: varchar('priority', { length: 50 }).notNull().default('NORMAL'),
  dueDate: timestamp('due_date'),
  lockedUntil: timestamp('locked_until'),
  /** Rodzaj zlecenia: machine_work (praca na maszynie, z materiałami) | machine_repair (naprawa, z częściami). */
  orderType: varchar('order_type', { length: 50 }).notNull().default('machine_work'),
  /** Opis usterki — tylko dla order_type = 'machine_repair'. */
  repairDescription: text('repair_description'),
  /** Notatki serwisowe po naprawie — tylko dla order_type = 'machine_repair'. */
  repairNotes: text('repair_notes'),
});

export const deviceLogs = pgTable('device_logs', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  level: varchar('level', { length: 20 }).notNull().default('INFO'), // INFO, WARN, ERROR, DEBUG
  message: text('message').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relacje ułatwiające zapytania ORM
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  settings: many(companySettings),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
  workSessions: many(workSessions),
}));

export const workSessionsRelations = relations(workSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [workSessions.userId],
    references: [users.id],
  }),
  resource: one(resources, {
    fields: [workSessions.resourceId],
    references: [resources.id],
  }),
  material: one(materials, {
    fields: [workSessions.materialId],
    references: [materials.id],
  }),
  customer: one(customers, {
    fields: [workSessions.customerId],
    references: [customers.id],
  }),
  photos: many(sessionPhotos),
  gpsLogs: many(gpsLogs),
  notes: many(sessionNotes),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  locations: many(customerLocations),
}));

export const customerLocationsRelations = relations(customerLocations, ({ one }) => ({
  customer: one(customers, { fields: [customerLocations.customerId], references: [customers.id] }),
}));

export const workOrdersRelations = relations(workOrders, ({ one }) => ({
  user: one(users, { fields: [workOrders.userId], references: [users.id] }),
  resource: one(resources, { fields: [workOrders.resourceId], references: [resources.id] }),
  material: one(materials, { fields: [workOrders.materialId], references: [materials.id] }),
  customer: one(customers, { fields: [workOrders.customerId], references: [customers.id] }),
  customerLocation: one(customerLocations, {
    fields: [workOrders.customerLocationId],
    references: [customerLocations.id],
  }),
}));

// ──────────────────────────────────────────────
// DUR — Dział Utrzymania Ruchu (magazyn części)
// ──────────────────────────────────────────────

/** Kategorie części zamiennych (hierarchiczne, wzorowane na material_categories). */
export const sparePartCategories = pgTable('spare_part_categories', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: integer('parent_id').references((): AnyPgColumn => sparePartCategories.id, { onDelete: 'set null' }),
  isGroup: boolean('is_group').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  color: varchar('color', { length: 50 }).default('#3f3f46'),
});

/** Części zamienne — magazyn DUR. */
export const spareParts = pgTable('spare_parts', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  catalogNumber: varchar('catalog_number', { length: 255 }).notNull().default(''),
  manufacturer: varchar('manufacturer', { length: 255 }).notNull().default(''),
  unit: varchar('unit', { length: 50 }).notNull().default('szt'),
  purchasePrice: numeric('purchase_price', { precision: 10, scale: 2 }),
  description: text('description'),
  minStock: numeric('min_stock', { precision: 10, scale: 2 }).notNull().default('0'),
  location: varchar('location', { length: 255 }).notNull().default(''),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Przypisanie części do kategorii części (N:M). */
export const sparePartToCategories = pgTable(
  'spare_part_to_categories',
  {
    partId: integer('part_id')
      .notNull()
      .references(() => spareParts.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => sparePartCategories.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.partId, t.categoryId] }),
  }),
);

/** Kompatybilność części z kategoriami maszyn (N:M). */
export const sparePartMachineCompatibility = pgTable(
  'spare_part_machine_compatibility',
  {
    partId: integer('part_id')
      .notNull()
      .references(() => spareParts.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => resourceCategories.id, { onDelete: 'cascade' }),
    notes: varchar('notes', { length: 255 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.partId, t.categoryId] }),
  }),
);

// Relacje DUR
export const sparePartCategoriesRelations = relations(sparePartCategories, ({ many }) => ({
  parts: many(sparePartToCategories),
}));

export const sparePartsRelations = relations(spareParts, ({ many }) => ({
  categories: many(sparePartToCategories),
  machineCompatibility: many(sparePartMachineCompatibility),
}));

export const sparePartToCategoriesRelations = relations(sparePartToCategories, ({ one }) => ({
  part: one(spareParts, { fields: [sparePartToCategories.partId], references: [spareParts.id] }),
  category: one(sparePartCategories, {
    fields: [sparePartToCategories.categoryId],
    references: [sparePartCategories.id],
  }),
}));

export const sparePartMachineCompatibilityRelations = relations(sparePartMachineCompatibility, ({ one }) => ({
  part: one(spareParts, {
    fields: [sparePartMachineCompatibility.partId],
    references: [spareParts.id],
  }),
  category: one(resourceCategories, {
    fields: [sparePartMachineCompatibility.categoryId],
    references: [resourceCategories.id],
  }),
}));

// ──────────────────────────────────────────────
// Work Order Spare Parts — części użyte w zleceniu naprawczym
// ──────────────────────────────────────────────

/** Części zamienne użyte w zleceniu naprawczym (order_type = 'machine_repair'). */
export const workOrderSpareParts = pgTable('work_order_spare_parts', {
  id: serial('id').primaryKey(),
  workOrderId: integer('work_order_id')
    .notNull()
    .references(() => workOrders.id, { onDelete: 'cascade' }),
  partId: integer('part_id')
    .notNull()
    .references(() => spareParts.id, { onDelete: 'cascade' }),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const workOrderSparePartsRelations = relations(workOrderSpareParts, ({ one }) => ({
  workOrder: one(workOrders, { fields: [workOrderSpareParts.workOrderId], references: [workOrders.id] }),
  part: one(spareParts, { fields: [workOrderSpareParts.partId], references: [spareParts.id] }),
}));

// ──────────────────────────────────────────────
// DUR — Faza 2: Gospodarka magazynowa
// ──────────────────────────────────────────────

/** Stan magazynowy części (1:1 z spare_parts). */
export const sparePartInventory = pgTable('spare_part_inventory', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  partId: integer('part_id')
    .notNull()
    .references(() => spareParts.id, { onDelete: 'cascade' }),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/** Przyjęcia magazynowe. */
export const stockReceipts = pgTable('stock_receipts', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  partId: integer('part_id')
    .notNull()
    .references(() => spareParts.id, { onDelete: 'cascade' }),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }),
  invoiceNumber: varchar('invoice_number', { length: 255 }),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Wydania magazynowe. */
export const stockIssues = pgTable('stock_issues', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  partId: integer('part_id')
    .notNull()
    .references(() => spareParts.id, { onDelete: 'cascade' }),
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  workOrderId: integer('work_order_id').references(() => workOrders.id, { onDelete: 'set null' }),
  issuedTo: integer('issued_to').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relacje DUR Faza 2
export const sparePartInventoryRelations = relations(sparePartInventory, ({ one }) => ({
  part: one(spareParts, { fields: [sparePartInventory.partId], references: [spareParts.id] }),
}));

export const stockReceiptsRelations = relations(stockReceipts, ({ one }) => ({
  part: one(spareParts, { fields: [stockReceipts.partId], references: [spareParts.id] }),
  creator: one(users, { fields: [stockReceipts.createdBy], references: [users.id] }),
}));

export const stockIssuesRelations = relations(stockIssues, ({ one }) => ({
  part: one(spareParts, { fields: [stockIssues.partId], references: [spareParts.id] }),
  workOrder: one(workOrders, { fields: [stockIssues.workOrderId], references: [workOrders.id] }),
  issuer: one(users, { fields: [stockIssues.createdBy], references: [users.id] }),
  recipient: one(users, { fields: [stockIssues.issuedTo], references: [users.id] }),
}));

// ──────────────────────────────────────────────
// Organizacja — działy, zespoły, członkowie
// ──────────────────────────────────────────────

/** Działy / oddziały w strukturze organizacyjnej firmy (hierarchiczne). */
export const departments = pgTable('departments', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: integer('parent_id').references((): AnyPgColumn => departments.id, { onDelete: 'set null' }),
  managerId: integer('manager_id').references(() => users.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Zespoły w ramach działu. */
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  departmentId: integer('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  leaderId: integer('leader_id').references(() => users.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** Przypisanie pracownika do zespołu (N:N). */
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).notNull().default('member'), // leader | member
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

// Relacje organizacji
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  company: one(companies, { fields: [departments.companyId], references: [companies.id] }),
  parent: one(departments, { fields: [departments.parentId], references: [departments.id] }),
  children: many(departments, { relationName: 'departmentChildren' }),
  manager: one(users, { fields: [departments.managerId], references: [users.id] }),
  teams: many(teams),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  company: one(companies, { fields: [teams.companyId], references: [companies.id] }),
  department: one(departments, { fields: [teams.departmentId], references: [departments.id] }),
  leader: one(users, { fields: [teams.leaderId], references: [users.id] }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));
