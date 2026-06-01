import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export class SettingsService {
  static async getSettings(companyId: number) {
    return await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.companyId, companyId))
      .limit(1);
  }

  static async updateSettings(
    companyId: number,
    updates: Partial<typeof companySettings.$inferInsert>
  ) {
    const { companyId: _omit, id: _id, ...rest } = updates;
    await db
      .insert(companySettings)
      .values({ ...rest, companyId } as typeof companySettings.$inferInsert)
      .onConflictDoUpdate({
        target: companySettings.companyId,
        set: rest,
      });
  }
}
