/** Zawężacze odpowiedzi API struktury organizacyjnej (`/api/admin/organization/*`). */

import { isRecord } from "./shared";

export type OrganizationDepartmentRow = {
  id: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
  sortOrder: number;
  isActive: boolean;
};

export type OrganizationTeamRow = {
  id: number;
  departmentId: number;
  name: string;
  leaderId: number | null;
  sortOrder: number;
  isActive: boolean;
};

export type OrganizationTeamMemberRow = {
  id: number;
  teamId: number;
  userId: number;
  role: string;
  user: {
    id: number;
    fullName: string;
    usernameEmail: string;
  };
};

export type OrganizationTeamDetail = OrganizationTeamRow & {
  members: OrganizationTeamMemberRow[];
};

function readNullableId(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : null;
}

export function narrowOrganizationDepartments(rows: unknown[]): OrganizationDepartmentRow[] {
  const out: OrganizationDepartmentRow[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    if (typeof row.id !== "number" || typeof row.name !== "string") continue;
    out.push({
      id: row.id,
      name: row.name,
      parentId: readNullableId(row.parentId),
      managerId: readNullableId(row.managerId),
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
      isActive: typeof row.isActive === "boolean" ? row.isActive : true,
    });
  }
  return out;
}

export function narrowOrganizationTeams(rows: unknown[]): OrganizationTeamRow[] {
  const out: OrganizationTeamRow[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    if (
      typeof row.id !== "number" ||
      typeof row.departmentId !== "number" ||
      typeof row.name !== "string"
    ) {
      continue;
    }
    out.push({
      id: row.id,
      departmentId: row.departmentId,
      name: row.name,
      leaderId: readNullableId(row.leaderId),
      sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
      isActive: typeof row.isActive === "boolean" ? row.isActive : true,
    });
  }
  return out;
}

function narrowOrganizationTeamMember(row: unknown): OrganizationTeamMemberRow | null {
  if (!isRecord(row)) return null;
  if (typeof row.id !== "number" || typeof row.userId !== "number" || typeof row.role !== "string") {
    return null;
  }
  const user = row.user;
  if (!isRecord(user) || typeof user.id !== "number" || typeof user.fullName !== "string") {
    return null;
  }
  const usernameEmail =
    typeof user.usernameEmail === "string" ? user.usernameEmail : String(user.id);
  return {
    id: row.id,
    teamId: typeof row.teamId === "number" ? row.teamId : 0,
    userId: row.userId,
    role: row.role,
    user: {
      id: user.id,
      fullName: user.fullName,
      usernameEmail,
    },
  };
}

export function narrowOrganizationTeamDetail(value: unknown): OrganizationTeamDetail | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.id !== "number" ||
    typeof value.departmentId !== "number" ||
    typeof value.name !== "string"
  ) {
    return null;
  }
  const membersRaw = Array.isArray(value.members) ? value.members : [];
  const members: OrganizationTeamMemberRow[] = [];
  for (const m of membersRaw) {
    const narrowed = narrowOrganizationTeamMember(m);
    if (narrowed) members.push(narrowed);
  }
  return {
    id: value.id,
    departmentId: value.departmentId,
    name: value.name,
    leaderId: readNullableId(value.leaderId),
    sortOrder: typeof value.sortOrder === "number" ? value.sortOrder : 0,
    isActive: typeof value.isActive === "boolean" ? value.isActive : true,
    members,
  };
}
