import { db } from "@/db";
import { platformAuditEvents } from "@/db/schema";

export const PLATFORM_AUDIT_ACTIONS = [
  "company.create",
  "company.update",
  "company.activate",
  "company.deactivate",
  "company.archive",
  "admin.create",
  "admin.reset_password",
  "admin.activate",
  "admin.deactivate",
  "flags.update",
  "impersonation.start",
  "impersonation.end",
] as const;

export type PlatformAuditAction = (typeof PLATFORM_AUDIT_ACTIONS)[number];

export const PLATFORM_AUDIT_TARGET_TYPES = ["company", "user", "flags", "impersonation"] as const;

export type PlatformAuditTargetType = (typeof PLATFORM_AUDIT_TARGET_TYPES)[number];

const ACTION_SET = new Set<string>(PLATFORM_AUDIT_ACTIONS);
const TARGET_SET = new Set<string>(PLATFORM_AUDIT_TARGET_TYPES);

export function isPlatformAuditAction(value: string): value is PlatformAuditAction {
  return ACTION_SET.has(value);
}

export function isPlatformAuditTargetType(value: string): value is PlatformAuditTargetType {
  return TARGET_SET.has(value);
}

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

export class PlatformAuditService {
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
