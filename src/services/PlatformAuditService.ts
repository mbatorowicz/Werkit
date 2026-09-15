import { db } from "@/db";
import { companies, platformAuditEvents, users } from "@/db/schema";
import { and, desc, eq, type SQL } from "drizzle-orm";
import {
  isPlatformAuditAction,
  isPlatformAuditTargetType,
  type PlatformAuditAction,
  type PlatformAuditListRow,
  type PlatformAuditTargetType,
} from "@/lib/platformAuditCatalog";

export {
  PLATFORM_AUDIT_ACTIONS,
  PLATFORM_AUDIT_TARGET_TYPES,
  isPlatformAuditAction,
  isPlatformAuditTargetType,
  type PlatformAuditAction,
  type PlatformAuditTargetType,
} from "@/lib/platformAuditCatalog";

export type PlatformAuditInsert = {
  actorUserId: number;
  companyId?: number | null;
  action: PlatformAuditAction;
  targetType?: PlatformAuditTargetType | null;
  targetId?: number | null;
  metadata?: Record<string, unknown> | null;
};

/** Usuwa klucze wyglądające na hasło — audyt nigdy nie trzyma secretów. */
export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!metadata) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (/password/i.test(key)) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export const PLATFORM_AUDIT_LIST_DEFAULT_LIMIT = 100;
export const PLATFORM_AUDIT_LIST_MAX_LIMIT = 200;

export type PlatformAuditListFilters = {
  companyId?: number;
  action?: PlatformAuditAction;
  limit?: number;
};

export { type PlatformAuditListRow } from "@/lib/platformAuditCatalog";

export function clampAuditListLimit(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw) || raw < 1) {
    return PLATFORM_AUDIT_LIST_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(raw), PLATFORM_AUDIT_LIST_MAX_LIMIT);
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? value : new Date(ms).toISOString();
}

export class PlatformAuditService {
  /** Odczyt dziennika — tylko panel `/platform` (superadmin). */
  static async list(filters: PlatformAuditListFilters = {}): Promise<PlatformAuditListRow[]> {
    const limit = clampAuditListLimit(filters.limit);
    const conditions: SQL[] = [];
    if (filters.companyId != null) {
      conditions.push(eq(platformAuditEvents.companyId, filters.companyId));
    }
    if (filters.action) {
      conditions.push(eq(platformAuditEvents.action, filters.action));
    }

    const rows = await db
      .select({
        id: platformAuditEvents.id,
        createdAt: platformAuditEvents.createdAt,
        actorUserId: platformAuditEvents.actorUserId,
        actorName: users.fullName,
        companyId: platformAuditEvents.companyId,
        companyName: companies.name,
        action: platformAuditEvents.action,
        targetType: platformAuditEvents.targetType,
        targetId: platformAuditEvents.targetId,
      })
      .from(platformAuditEvents)
      .innerJoin(users, eq(platformAuditEvents.actorUserId, users.id))
      .leftJoin(companies, eq(platformAuditEvents.companyId, companies.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(platformAuditEvents.createdAt))
      .limit(limit);

    const out: PlatformAuditListRow[] = [];
    for (const row of rows) {
      if (!isPlatformAuditAction(row.action)) continue;
      const targetType =
        row.targetType != null && isPlatformAuditTargetType(row.targetType) ? row.targetType : null;
      out.push({
        id: row.id,
        createdAt: toIso(row.createdAt),
        actorUserId: row.actorUserId,
        actorName: row.actorName,
        companyId: row.companyId,
        companyName: row.companyName ?? null,
        action: row.action,
        targetType,
        targetId: row.targetId,
      });
    }
    return out;
  }

  /** Jedyny zapis do `platform_audit_events`. */
  static async insert(input: PlatformAuditInsert): Promise<void> {
    if (!isPlatformAuditAction(input.action)) {
      throw new Error("invalid_audit_action");
    }
    const targetType = input.targetType ?? null;
    if (targetType != null && !isPlatformAuditTargetType(targetType)) {
      throw new Error("invalid_audit_target");
    }

    await db.insert(platformAuditEvents).values({
      actorUserId: input.actorUserId,
      companyId: input.companyId ?? null,
      action: input.action,
      targetType,
      targetId: input.targetId ?? null,
      metadata: sanitizeAuditMetadata(input.metadata ?? null),
    });
  }
}
