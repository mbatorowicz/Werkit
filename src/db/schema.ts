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

export const resources = pgTable('resources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // VEHICLE, MACHINE, STATIONARY
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
