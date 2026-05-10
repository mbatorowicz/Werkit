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

  static async getWorkers() {
    return await db.select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.role, 'worker'));
  }

  static async createUser(payload: {
    fullName: string;
    usernameEmail: string;
    passwordHash: string;
    role?: 'worker' | 'admin';
    canCreateOwnOrders?: boolean;
  }) {
    await db.insert(users).values({
      fullName: payload.fullName,
      usernameEmail: payload.usernameEmail,
      passwordHash: payload.passwordHash,
      role: payload.role || 'worker',
      isActive: true,
      canCreateOwnOrders: payload.canCreateOwnOrders !== undefined ? payload.canCreateOwnOrders : true,
    });
  }

  static async updateUser(userId: number, updates: Partial<typeof users.$inferInsert>) {
    await db.update(users).set(updates).where(eq(users.id, userId));
  }

  static async deleteUser(userId: number) {
    await db.delete(users).where(eq(users.id, userId));
  }
}
