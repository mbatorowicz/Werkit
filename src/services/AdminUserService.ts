import { db } from '@/db';
import { users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

export class AdminUserService {
  static async getAllUsers() {
    return await db.select({
      id: users.id,
      fullName: users.fullName,
      usernameEmail: users.usernameEmail,
      role: users.role,
      isActive: users.isActive,
      canCreateOwnOrders: users.canCreateOwnOrders,
    }).from(users).orderBy(desc(users.id));
  }

  static async getUserById(userId: number) {
    const userDb = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return userDb[0] || null;
  }

  static async getUserByUsername(usernameEmail: string) {
    const userDb = await db.select().from(users).where(eq(users.usernameEmail, usernameEmail)).limit(1);
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
  }) {
    const role = payload.role || 'worker';
    const canCreateOwnOrders =
      role === 'worker'
        ? payload.canCreateOwnOrders !== undefined
          ? payload.canCreateOwnOrders
          : true
        : false;
    await db.insert(users).values({
      fullName: payload.fullName,
      usernameEmail: payload.usernameEmail,
      passwordHash: payload.passwordHash,
      role,
      isActive: true,
      canCreateOwnOrders,
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
    return bcrypt.compare(plainPassword, row[0].passwordHash);
  }

  static async deleteUser(userId: number) {
    await db.delete(users).where(eq(users.id, userId));
  }
}

/** Aktualizacja rekordu użytkownika z API — bez importu schematu w kontrolerze. */
export type UserUpdatePayload = Partial<typeof users.$inferInsert>;
