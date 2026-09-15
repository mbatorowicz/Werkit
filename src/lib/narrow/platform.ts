/**
 * Type narrowing odpowiedzi API panelu platformy (superadmin).
 */
import { isRecord, readBool } from "./shared";
import type { PlatformTenantUserRow } from "@/services/PlatformTenantUserService";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import {
  isPlatformAuditAction,
  isPlatformAuditTargetType,
  type PlatformAuditListRow,
} from "@/lib/platformAuditCatalog";
import { isCompanyLifecycleStatus, isCompanyPlanKey } from "@/lib/companyLifecycle";

function readString(r: Record<string, unknown>, k: string, fallback = ""): string {
  return typeof r[k] === "string" ? r[k] : fallback;
}

function readFiniteId(r: Record<string, unknown>, k: string): number | null {
  const v = r[k];
  if (typeof v === "number" && Number.isInteger(v) && v >= 1) return v;
  return null;
}

function readNonNegInt(r: Record<string, unknown>, k: string, fallback = 0): number {
  const v = r[k];
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return Math.floor(v);
  return fallback;
}

function readIsoOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function narrowPlatformTenantUserRole(v: unknown): "admin" | "viewer" | null {
  if (v === "admin" || v === "viewer") return v;
  return null;
}

export function narrowPlatformTenantUser(u: unknown): PlatformTenantUserRow | null {
  if (!isRecord(u)) return null;
  const id = readFiniteId(u, "id");
  const role = narrowPlatformTenantUserRole(u.role);
  if (id == null || role == null) return null;
  const lastRaw = u.lastLoginAt;
  const lastLoginAt = typeof lastRaw === "string" && lastRaw.trim() ? lastRaw : null;
  return {
    id,
    fullName: readString(u, "fullName"),
    usernameEmail: readString(u, "usernameEmail"),
    role,
    isActive: readBool(u, "isActive", false),
    lastLoginAt,
  };
}

export function narrowPlatformTenantUsers(data: unknown): PlatformTenantUserRow[] {
  if (!Array.isArray(data)) return [];
  const out: PlatformTenantUserRow[] = [];
  for (const item of data) {
    const row = narrowPlatformTenantUser(item);
    if (row) out.push(row);
  }
  return out;
}

export function narrowCompanyUsageRow(u: unknown): CompanyUsageRow | null {
  if (!isRecord(u)) return null;
  const companyId = readFiniteId(u, "companyId");
  if (companyId == null) return null;
  const lifecycleStatus = isCompanyLifecycleStatus(u.lifecycleStatus)
    ? u.lifecycleStatus
    : "active";
  const planKey = isCompanyPlanKey(u.planKey) ? u.planKey : null;
  const noteRaw = u.internalNote;
  const internalNote = typeof noteRaw === "string" ? noteRaw : null;
  return {
    companyId,
    companyName: readString(u, "companyName"),
    slug: readString(u, "slug"),
    isActive: readBool(u, "isActive", false),
    lifecycleStatus,
    planKey,
    internalNote,
    userCount: readNonNegInt(u, "userCount"),
    workerCount: readNonNegInt(u, "workerCount"),
    sessionsLast30Days: readNonNegInt(u, "sessionsLast30Days"),
    pendingOrders: readNonNegInt(u, "pendingOrders"),
    deviceLogsLast7Days: readNonNegInt(u, "deviceLogsLast7Days"),
    lastAdminLoginAt: readIsoOrNull(u.lastAdminLoginAt),
    lastWorkerLoginAt: readIsoOrNull(u.lastWorkerLoginAt),
    activeSessionsNow: readNonNegInt(u, "activeSessionsNow"),
    errorLogsLast24h: readNonNegInt(u, "errorLogsLast24h"),
  };
}

export function narrowCompanyUsageRows(data: unknown): CompanyUsageRow[] {
  if (!Array.isArray(data)) return [];
  const out: CompanyUsageRow[] = [];
  for (const item of data) {
    const row = narrowCompanyUsageRow(item);
    if (row) out.push(row);
  }
  return out;
}

export function narrowPlatformAuditEvent(u: unknown): PlatformAuditListRow | null {
  if (!isRecord(u)) return null;
  const id = readFiniteId(u, "id");
  const actorUserId = readFiniteId(u, "actorUserId");
  if (id == null || actorUserId == null) return null;
  if (typeof u.action !== "string" || !isPlatformAuditAction(u.action)) return null;
  const createdAt = readIsoOrNull(u.createdAt);
  if (!createdAt) return null;
  const targetType =
    typeof u.targetType === "string" && isPlatformAuditTargetType(u.targetType)
      ? u.targetType
      : null;
  const companyIdRaw = u.companyId;
  const companyId =
    typeof companyIdRaw === "number" && Number.isInteger(companyIdRaw) && companyIdRaw >= 1
      ? companyIdRaw
      : null;
  const targetIdRaw = u.targetId;
  const targetId =
    typeof targetIdRaw === "number" && Number.isInteger(targetIdRaw) && targetIdRaw >= 1
      ? targetIdRaw
      : null;
  const companyNameRaw = u.companyName;
  return {
    id,
    createdAt,
    actorUserId,
    actorName: readString(u, "actorName"),
    companyId,
    companyName: typeof companyNameRaw === "string" && companyNameRaw.trim() ? companyNameRaw : null,
    action: u.action,
    targetType,
    targetId,
  };
}

export function narrowPlatformAuditEvents(data: unknown): PlatformAuditListRow[] {
  if (!Array.isArray(data)) return [];
  const out: PlatformAuditListRow[] = [];
  for (const item of data) {
    const row = narrowPlatformAuditEvent(item);
    if (row) out.push(row);
  }
  return out;
}
