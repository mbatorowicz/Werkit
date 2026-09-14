/**
 * Type narrowing odpowiedzi API panelu platformy (superadmin).
 */
import { isRecord, readBool } from "./shared";
import type { PlatformTenantUserRow } from "@/services/PlatformTenantUserService";

function readString(r: Record<string, unknown>, k: string, fallback = ""): string {
  return typeof r[k] === "string" ? r[k] : fallback;
}

function readFiniteId(r: Record<string, unknown>, k: string): number | null {
  const v = r[k];
  if (typeof v === "number" && Number.isInteger(v) && v >= 1) return v;
  return null;
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
