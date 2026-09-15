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

export type PlatformAuditListRow = {
  id: number;
  createdAt: string;
  actorUserId: number;
  actorName: string;
  companyId: number | null;
  companyName: string | null;
  action: PlatformAuditAction;
  targetType: PlatformAuditTargetType | null;
  targetId: number | null;
};
