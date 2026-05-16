import { db } from '@/db';
import { companies, companySettings, users } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export type CompanyRow = typeof companies.$inferSelect;

function slugifyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return base || 'firma';
}

export class PlatformCompanyService {
  static async listCompanies(): Promise<CompanyRow[]> {
    return db.select().from(companies).orderBy(desc(companies.id));
  }

  static async getCompanyById(id: number): Promise<CompanyRow | null> {
    const rows = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return rows[0] ?? null;
  }

  static async createCompany(name: string, slugInput?: string): Promise<CompanyRow> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('missing_name');

    let slug = (slugInput?.trim() || slugifyName(trimmed)).toLowerCase();
    if (!slug) slug = 'firma';

    const [row] = await db
      .insert(companies)
      .values({ name: trimmed, slug, isActive: true })
      .returning();

    await db.insert(companySettings).values({
      companyId: row.id,
      companyName: trimmed,
    });

    return row;
  }

  static async updateCompany(
    id: number,
    patch: { name?: string; slug?: string; isActive?: boolean },
  ): Promise<CompanyRow | null> {
    const existing = await PlatformCompanyService.getCompanyById(id);
    if (!existing) return null;

    const updates: Partial<typeof companies.$inferInsert> = {};
    if (patch.name !== undefined) updates.name = patch.name.trim();
    if (patch.slug !== undefined) updates.slug = patch.slug.trim().toLowerCase();
    if (patch.isActive !== undefined) updates.isActive = patch.isActive;

    if (Object.keys(updates).length === 0) return existing;

    const [row] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, id))
      .returning();

    if (updates.name) {
      await db
        .update(companySettings)
        .set({ companyName: updates.name })
        .where(eq(companySettings.companyId, id));
    }

    return row;
  }

  static async createCompanyAdmin(
    companyId: number,
    payload: {
      fullName: string;
      usernameEmail: string;
      passwordHash: string;
    },
  ): Promise<void> {
    const company = await PlatformCompanyService.getCompanyById(companyId);
    if (!company) throw new Error('company_not_found');

    await db.insert(users).values({
      companyId,
      fullName: payload.fullName.trim(),
      usernameEmail: payload.usernameEmail.trim().toLowerCase(),
      passwordHash: payload.passwordHash,
      role: 'admin',
      isActive: true,
      canCreateOwnOrders: false,
      canEditRoute: false,
    });
  }
}
