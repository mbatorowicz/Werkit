/** Zawężacze odpowiedzi API struktury organizacyjnej (`/api/admin/organization/*`). */

import type {
  DelegatableWorkerRow,
  DepartmentTreeNode,
  OrganizationTreePayload,
  TeamMemberWithUser,
  TeamWithMembers,
  UserOrgProfile,
} from "@/types/organization";
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
  if (
    typeof row.id !== "number" ||
    typeof row.userId !== "number" ||
    typeof row.role !== "string"
  ) {
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

function narrowOrgPositionRef(row: unknown): { id: number; name: string } | null {
  if (!isRecord(row) || typeof row.id !== "number" || typeof row.name !== "string") return null;
  return { id: row.id, name: row.name };
}

export function narrowUserOrgProfile(value: unknown): UserOrgProfile | null {
  if (!isRecord(value)) return null;
  const deptManagerOf = Array.isArray(value.deptManagerOf)
    ? value.deptManagerOf.flatMap((r) => {
        const n = narrowOrgPositionRef(r);
        return n ? [n] : [];
      })
    : [];
  const teamLeaderOf = Array.isArray(value.teamLeaderOf)
    ? value.teamLeaderOf.flatMap((r) => {
        const n = narrowOrgPositionRef(r);
        return n ? [n] : [];
      })
    : [];
  const teamMemberships = Array.isArray(value.teamMemberships)
    ? value.teamMemberships.flatMap((r) => {
        if (!isRecord(r) || typeof r.teamId !== "number" || typeof r.name !== "string") return [];
        return [
          {
            id: typeof r.id === "number" ? r.id : r.teamId,
            teamId: r.teamId,
            name: r.name,
            departmentName:
              r.departmentName === null || typeof r.departmentName === "string"
                ? (r.departmentName as string | null)
                : null,
            role: typeof r.role === "string" ? r.role : "member",
          },
        ];
      })
    : [];
  const supervisorChain = Array.isArray(value.supervisorChain)
    ? value.supervisorChain.flatMap((r) => {
        if (
          !isRecord(r) ||
          typeof r.userId !== "number" ||
          typeof r.fullName !== "string" ||
          (r.kind !== "team_leader" && r.kind !== "dept_manager")
        ) {
          return [];
        }
        return [
          {
            userId: r.userId,
            fullName: r.fullName,
            kind: r.kind as "team_leader" | "dept_manager",
          },
        ];
      })
    : [];
  let directSupervisor: UserOrgProfile["directSupervisor"] = null;
  if (isRecord(value.directSupervisor)) {
    const ds = value.directSupervisor;
    if (typeof ds.userId === "number" && typeof ds.fullName === "string") {
      directSupervisor = { userId: ds.userId, fullName: ds.fullName };
    }
  }
  return { deptManagerOf, teamLeaderOf, teamMemberships, supervisorChain, directSupervisor };
}

function narrowTeamMemberWithUser(row: unknown): TeamMemberWithUser | null {
  if (!isRecord(row) || typeof row.id !== "number" || typeof row.teamId !== "number") {
    return null;
  }
  if (typeof row.userId !== "number" || typeof row.role !== "string") return null;
  const user = row.user;
  if (!isRecord(user) || typeof user.id !== "number" || typeof user.fullName !== "string") {
    return null;
  }
  const usernameEmail = typeof user.usernameEmail === "string" ? user.usernameEmail : "";
  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    role: row.role,
    joinedAt: row.joinedAt instanceof Date ? row.joinedAt : new Date(),
    user: { id: user.id, fullName: user.fullName, usernameEmail },
  };
}

function narrowTeamWithMembers(row: unknown): TeamWithMembers | null {
  if (!isRecord(row) || typeof row.id !== "number" || typeof row.name !== "string") {
    return null;
  }
  if (typeof row.departmentId !== "number") return null;
  const membersRaw = Array.isArray(row.members) ? row.members : [];
  const members: TeamMemberWithUser[] = [];
  for (const m of membersRaw) {
    const n = narrowTeamMemberWithUser(m);
    if (n) members.push(n);
  }
  return {
    id: row.id,
    companyId: typeof row.companyId === "number" ? row.companyId : 0,
    departmentId: row.departmentId,
    name: row.name,
    leaderId: readNullableId(row.leaderId),
    sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
    isActive: typeof row.isActive === "boolean" ? row.isActive : true,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(),
    members,
  };
}

function narrowDepartmentTreeNode(row: unknown): DepartmentTreeNode | null {
  if (!isRecord(row) || typeof row.id !== "number" || typeof row.name !== "string") {
    return null;
  }
  const childrenRaw = Array.isArray(row.children) ? row.children : [];
  const children: DepartmentTreeNode[] = [];
  for (const c of childrenRaw) {
    const n = narrowDepartmentTreeNode(c);
    if (n) children.push(n);
  }
  const teamsRaw = Array.isArray(row.teams) ? row.teams : [];
  const teams: TeamWithMembers[] = [];
  for (const t of teamsRaw) {
    const n = narrowTeamWithMembers(t);
    if (n) teams.push(n);
  }
  return {
    id: row.id,
    companyId: typeof row.companyId === "number" ? row.companyId : 0,
    name: row.name,
    parentId: readNullableId(row.parentId),
    managerId: readNullableId(row.managerId),
    sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
    isActive: typeof row.isActive === "boolean" ? row.isActive : true,
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(),
    children,
    teams,
  };
}

export function narrowOrganizationTreePayload(value: unknown): OrganizationTreePayload | null {
  if (!isRecord(value)) return null;
  const treeRaw = Array.isArray(value.tree) ? value.tree : [];
  const tree: DepartmentTreeNode[] = [];
  for (const n of treeRaw) {
    const row = narrowDepartmentTreeNode(n);
    if (row) tree.push(row);
  }
  const unassignedRaw = Array.isArray(value.unassignedUsers) ? value.unassignedUsers : [];
  const unassignedUsers: OrganizationTreePayload["unassignedUsers"] = [];
  for (const u of unassignedRaw) {
    if (!isRecord(u) || typeof u.id !== "number" || typeof u.fullName !== "string") continue;
    unassignedUsers.push({
      id: u.id,
      fullName: u.fullName,
      role: typeof u.role === "string" ? u.role : "worker",
    });
  }
  return { tree, unassignedUsers };
}

export function narrowDelegatableWorkers(rows: unknown[]): DelegatableWorkerRow[] {
  const out: DelegatableWorkerRow[] = [];
  for (const row of rows) {
    if (!isRecord(row) || typeof row.id !== "number" || typeof row.fullName !== "string") {
      continue;
    }
    const orgLabel =
      row.orgLabel === null || typeof row.orgLabel === "string"
        ? (row.orgLabel as string | null)
        : null;
    out.push({ id: row.id, fullName: row.fullName, orgLabel });
  }
  return out;
}
