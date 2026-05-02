import { pgTable, serial, varchar, text, timestamp, boolean, integer, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  usernameEmail: varchar('username_email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('worker'), // worker, admin
  deviceUniqueId: varchar('device_unique_id', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
});

export const resourceCategories = pgTable('resource_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  categoryId: integer('category_id').references(() => resourceCategories.id, { onDelete: 'set null' }),
});

export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
});

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  defaultAddress: text('default_address'),
});

export const workSessions = pgTable('work_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'set null' }),
  sessionType: varchar('session_type', { length: 50 }).notNull(), // TRANSPORT, MACHINE_OP, WORKSHOP
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

export const companySettings = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  companyName: varchar('company_name', { length: 255 }).notNull().default('Werkit ERP'),
  companyAddress: text('company_address'),
  zipCode: varchar('zip_code', { length: 20 }),
  city: varchar('city', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  baseLatitude: numeric('base_latitude', { precision: 10, scale: 8 }),
  baseLongitude: numeric('base_longitude', { precision: 11, scale: 8 }),
});

export const workOrders = pgTable('work_orders', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resourceId: integer('resource_id').notNull().references(() => resources.id, { onDelete: 'set null' }),
  sessionType: varchar('session_type', { length: 50 }).notNull(),
  materialId: integer('material_id').references(() => materials.id, { onDelete: 'set null' }),
  customerId: integer('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  taskDescription: text('task_description'),
  status: varchar('status', { length: 50 }).notNull().default('PENDING'), // PENDING, COMPLETED, CANCELLED
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdById: integer('created_by_id').references(() => users.id, { onDelete: 'set null' }),
});

// Relacje ułatwiające zapytania ORM
export const usersRelations = relations(users, ({ many }) => ({
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
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  category: one(resourceCategories, {
    fields: [resources.categoryId],
    references: [resourceCategories.id]
  })
}));

export const workOrdersRelations = relations(workOrders, ({ one }) => ({
  user: one(users, { fields: [workOrders.userId], references: [users.id] }),
  resource: one(resources, { fields: [workOrders.resourceId], references: [resources.id] }),
  material: one(materials, { fields: [workOrders.materialId], references: [materials.id] }),
  customer: one(customers, { fields: [workOrders.customerId], references: [customers.id] })
}));
