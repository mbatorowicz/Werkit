import { db } from "@/db";
import { companies, companySettings, users } from "@/db/schema";
import {
  applyIsActiveToggle,
  canCreateCompanyAdmin,
  DEFAULT_COMPANY_PLAN_KEY,
  isCompanyLifecycleStatus,
  isCompanyPlanKey,
  lifecycleToIsActive,
  parseInternalNote,
  type CompanyLifecycleStatus,
  type CompanyPlanKey,
} from "@/lib/companyLifecycle";
import { findPgUniqueViolation } from "@/lib/pgErrors";
import { desc, eq } from "drizzle-orm";

export type CompanyRow = typeof companies.$inferSelect;

export type CompanyUpdatePatch = {
  name?: string;
  slug?: string;
  /** Mapuje active/trial ↔ suspended; archived nie rusza. Ignorowane gdy podano `lifecycleStatus`. */
  isActive?: boolean;
  lifecycleStatus?: CompanyLifecycleStatus;
  internalNote?: string | null;
  planKey?: CompanyPlanKey;
};

function slugifyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
  return base || "firma";
}

function readLifecycle(row: CompanyRow): CompanyLifecycleStatus {
  return isCompanyLifecycleStatus(row.lifecycleStatus) ? row.lifecycleStatus : "active";
}

function companyInsertValues(name: string, slug: string) {
  return {
    name,
    slug,
    isActive: true,
    lifecycleStatus: "active" as const,
    planKey: DEFAULT_COMPANY_PLAN_KEY,
  };
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
    if (!trimmed) throw new Error("missing_name");

    let slug = (slugInput?.trim() || slugifyName(trimmed)).toLowerCase();
    if (!slug) slug = "firma";

    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(companies)
        .values(companyInsertValues(trimmed, slug))
        .returning();

      await tx.insert(companySettings).values({
        companyId: row.id,
        companyName: trimmed,
      });

      return row;
    });
  }

  /**
   * Atomowe utworzenie firmy + opcjonalnego admina (hasło już zahashowane).
   */
  static async createCompanyWithAdmin(
    name: string,
    slugInput: string | undefined,
    admin: { fullName: string; usernameEmail: string; passwordHash: string } | null
  ): Promise<CompanyRow> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("missing_name");

    let slug = (slugInput?.trim() || slugifyName(trimmed)).toLowerCase();
    if (!slug) slug = "firma";

    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(companies)
        .values(companyInsertValues(trimmed, slug))
        .returning();

      await tx.insert(companySettings).values({
        companyId: row.id,
        companyName: trimmed,
      });

      if (admin) {
        await tx.insert(users).values({
          companyId: row.id,
          fullName: admin.fullName.trim(),
          usernameEmail: admin.usernameEmail.trim().toLowerCase(),
          passwordHash: admin.passwordHash,
          role: "admin",
          isActive: true,
          canCreateOwnOrders: false,
          canEditRoute: false,
          canCreateCustomers: false,
        });
      }

      return row;
    });
  }

  static async updateCompany(id: number, patch: CompanyUpdatePatch): Promise<CompanyRow | null> {
    const existing = await PlatformCompanyService.getCompanyById(id);
    if (!existing) return null;

    const updates: Partial<typeof companies.$inferInsert> = {};
    if (patch.name !== undefined) updates.name = patch.name.trim();
    if (patch.slug !== undefined) updates.slug = patch.slug.trim().toLowerCase();
    if (patch.internalNote !== undefined) {
      updates.internalNote = parseInternalNote(patch.internalNote) ?? null;
    }
    if (patch.planKey !== undefined && isCompanyPlanKey(patch.planKey)) {
      updates.planKey = patch.planKey;
    }

    if (patch.lifecycleStatus !== undefined) {
      if (!isCompanyLifecycleStatus(patch.lifecycleStatus)) {
        throw new Error("invalid_lifecycle");
      }
      updates.lifecycleStatus = patch.lifecycleStatus;
      updates.isActive = lifecycleToIsActive(patch.lifecycleStatus);
    } else if (patch.isActive !== undefined) {
      const next = applyIsActiveToggle(readLifecycle(existing), patch.isActive);
      updates.lifecycleStatus = next.lifecycleStatus;
      updates.isActive = next.isActive;
    }

    if (Object.keys(updates).length === 0) return existing;

    const [row] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();

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
    }
  ): Promise<number> {
    const company = await PlatformCompanyService.getCompanyById(companyId);
    if (!company) throw new Error("company_not_found");
    if (!canCreateCompanyAdmin(readLifecycle(company))) {
      throw new Error("company_inactive");
    }

    const [created] = await db
      .insert(users)
      .values({
        companyId,
        fullName: payload.fullName.trim(),
        usernameEmail: payload.usernameEmail.trim().toLowerCase(),
        passwordHash: payload.passwordHash,
        role: "admin",
        isActive: true,
        canCreateOwnOrders: false,
        canEditRoute: false,
        canCreateCustomers: false,
      })
      .returning({ id: users.id });
    if (!created) throw new Error("save_error");
    return created.id;
  }

  static mapCreateError(err: unknown): "slug_exists" | "user_exists" | null {
    const violation = findPgUniqueViolation(err);
    if (!violation) return null;
    const outerMsg = err instanceof Error ? err.message : "";
    const msg = `${violation.message} ${outerMsg}`;
    if (/users.*username|username_email|unique.*email/i.test(msg)) return "user_exists";
    if (/companies.*slug|slug/i.test(msg)) return "slug_exists";
    return "slug_exists";
  }
}
