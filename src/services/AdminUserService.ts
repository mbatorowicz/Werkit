import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { comparePassword } from '@/lib/passwordCrypto';

export class AdminUserService {
  static async getAllUsers() {
    return await db.select({
      id: users.id,
      fullName: users.fullName,
      usernameEmail: users.usernameEmail,
      role: users.role,
      isActive: users.isActive,
      canCreateOwnOrders: users.canCreateOwnOrders,
      canEditRoute: users.canEditRoute,
    }).from(users).orderBy(desc(users.id));
  }

  static async getUserById(userId: number) {
    const userDb = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return userDb[0] || null;
  }

  static async getUserByUsername(usernameEmail: string) {
    const normalized = usernameEmail.trim().toLowerCase();
    const userDb = await db
      .select()
      .from(users)
      .where(sql`lower(${users.usernameEmail}) = ${normalized}`)
      .limit(1);
    return userDb[0] || null;
  }

  static async getWorkers() {
    return await db.select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.role, 'worker'));
  }

  static async createUser(payload: {
    fullName: string;
    usernameEmail: string;
    passwordHash: string;
    role?: 'worker' | 'admin' | 'viewer';
    canCreateOwnOrders?: boolean;
    canEditRoute?: boolean;
  }) {
    const role = payload.role || 'worker';
    const canCreateOwnOrders =
      role === 'worker'
        ? payload.canCreateOwnOrders !== undefined
          ? payload.canCreateOwnOrders
          : true
        : false;
    const canEditRoute = role === 'worker' ? !!payload.canEditRoute : false;
    await db.insert(users).values({
      fullName: payload.fullName,
      usernameEmail: payload.usernameEmail,
      passwordHash: payload.passwordHash,
      role,
      isActive: true,
      canCreateOwnOrders,
      canEditRoute,
    });
  }

  static async updateUser(userId: number, updates: Partial<typeof users.$inferInsert>) {
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  /** Weryfikacja hasła bez zwracania pełnego rekordu użytkownika (np. włączenie biometrii). */
  static async verifyPasswordForUserId(userId: number, plainPassword: string): Promise<boolean> {
    const row = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row[0]) return false;
    return comparePassword(plainPassword, row[0].passwordHash);
  }

  static async deleteUser(userId: number) {
    await db.delete(users).where(eq(users.id, userId));
  }
}

/** Aktualizacja rekordu użytkownika z API — bez importu schematu w kontrolerze. */
export type UserUpdatePayload = Partial<typeof users.$inferInsert>;
