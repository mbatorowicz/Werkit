// ============================================================
// Werkit — Zasięg delegowania zleceń wg struktury organizacyjnej
// ============================================================

import { db } from "@/db";
import { departments, teams, teamMembers, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { DelegatableWorkerRow, UserOrgProfile } from "@/types/organization";

type CompanyOrgCache = {
  departments: { id: number; name: string; managerId: number | null }[];
  teams: { id: number; name: string; departmentId: number; leaderId: number | null }[];
  memberships: {
    userId: number;
    teamId: number;
    teamName: string;
    departmentName: string;
    role: string;
  }[];
  usersById: Map<
    number,
    { id: number; fullName: string; role: string; isActive: boolean; reportsToId: number | null }
  >;
};

export class DelegationScopeService {
  private static async loadCompanyOrgCache(companyId: number): Promise<CompanyOrgCache> {
    const [deptRows, teamRows, memberRows, userRows] = await Promise.all([
      db
        .select({
          id: departments.id,
          name: departments.name,
          managerId: departments.managerId,
        })
        .from(departments)
        .where(eq(departments.companyId, companyId)),
      db
        .select({
          id: teams.id,
          name: teams.name,
          departmentId: teams.departmentId,
          leaderId: teams.leaderId,
        })
        .from(teams)
        .where(eq(teams.companyId, companyId)),
      db
        .select({
          userId: teamMembers.userId,
          teamId: teamMembers.teamId,
          teamName: teams.name,
          departmentName: departments.name,
          role: teamMembers.role,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .innerJoin(departments, eq(teams.departmentId, departments.id))
        .where(eq(teams.companyId, companyId)),
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          reportsToId: users.reportsToId,
        })
        .from(users)
        .where(eq(users.companyId, companyId)),
    ]);

    return {
      departments: deptRows,
      teams: teamRows,
      memberships: memberRows,
      usersById: new Map(userRows.map((u) => [u.id, u])),
    };
  }

  static buildUserOrgProfile(userId: number, cache: CompanyOrgCache): UserOrgProfile {
    const deptManagerOf = cache.departments
      .filter((d) => d.managerId === userId)
      .map((d) => ({ id: d.id, name: d.name }));

    const teamLeaderOf = cache.teams
      .filter((t) => t.leaderId === userId)
      .map((t) => ({ id: t.id, name: t.name }));

    const teamMemberships = cache.memberships
      .filter((m) => m.userId === userId)
      .map((m) => ({
        id: m.teamId,
        teamId: m.teamId,
        name: m.teamName,
        departmentName: m.departmentName,
        role: m.role,
      }));

    const supervisorChain: UserOrgProfile["supervisorChain"] = [];
    const primaryMembership = cache.memberships.find(
      (m) => m.userId === userId && m.role !== "leader"
    );
    if (primaryMembership) {
      const team = cache.teams.find((t) => t.id === primaryMembership.teamId);
      if (team?.leaderId && team.leaderId !== userId) {
        const leader = cache.usersById.get(team.leaderId);
        if (leader) {
          supervisorChain.push({
            userId: leader.id,
            fullName: leader.fullName,
            kind: "team_leader",
          });
        }
      }
      const dept = cache.departments.find((d) => d.id === team?.departmentId);
      if (dept?.managerId && dept.managerId !== userId) {
        const manager = cache.usersById.get(dept.managerId);
        if (manager) {
          supervisorChain.push({
            userId: manager.id,
            fullName: manager.fullName,
            kind: "dept_manager",
          });
        }
      }
    }

    const self = cache.usersById.get(userId);
    let directSupervisor: UserOrgProfile["directSupervisor"] = null;
    if (self?.reportsToId) {
      const sup = cache.usersById.get(self.reportsToId);
      if (sup) {
        directSupervisor = { userId: sup.id, fullName: sup.fullName };
      }
    }

    return { deptManagerOf, teamLeaderOf, teamMemberships, supervisorChain, directSupervisor };
  }

  static async getUserOrgProfile(companyId: number, userId: number): Promise<UserOrgProfile> {
    const cache = await this.loadCompanyOrgCache(companyId);
    return this.buildUserOrgProfile(userId, cache);
  }

  static async getOrgProfilesForCompany(companyId: number): Promise<Map<number, UserOrgProfile>> {
    const cache = await this.loadCompanyOrgCache(companyId);
    const map = new Map<number, UserOrgProfile>();
    for (const userId of cache.usersById.keys()) {
      map.set(userId, this.buildUserOrgProfile(userId, cache));
    }
    return map;
  }

  static async hasDelegationRights(companyId: number, userId: number): Promise<boolean> {
    const profile = await this.getUserOrgProfile(companyId, userId);
    return profile.deptManagerOf.length > 0 || profile.teamLeaderOf.length > 0;
  }

  /** `all` = pełny admin; inaczej lista ID aktywnych workerów w zasięgu (bez aktora). */
  static async getDelegatableUserIds(
    companyId: number,
    actorUserId: number,
    actorRole: string
  ): Promise<"all" | number[]> {
    if (actorRole === "admin") return "all";

    const cache = await this.loadCompanyOrgCache(companyId);
    const profile = this.buildUserOrgProfile(actorUserId, cache);
    if (profile.deptManagerOf.length === 0 && profile.teamLeaderOf.length === 0) {
      return [];
    }

    const teamIds = new Set<number>();

    for (const team of profile.teamLeaderOf) {
      teamIds.add(team.id);
    }

    const managedDeptIds = new Set(profile.deptManagerOf.map((d) => d.id));
    for (const team of cache.teams) {
      if (managedDeptIds.has(team.departmentId)) {
        teamIds.add(team.id);
      }
    }

    const memberUserIds = new Set<number>();
    for (const m of cache.memberships) {
      if (teamIds.has(m.teamId)) {
        memberUserIds.add(m.userId);
      }
    }

    const out: number[] = [];
    for (const uid of memberUserIds) {
      if (uid === actorUserId) continue;
      const u = cache.usersById.get(uid);
      if (u && u.isActive && u.role === "worker") {
        out.push(uid);
      }
    }
    return out.sort((a, b) => a - b);
  }

  static buildOrgLabel(profile: UserOrgProfile): string | null {
    const parts: string[] = [];
    for (const d of profile.deptManagerOf) parts.push(d.name);
    for (const t of profile.teamLeaderOf) parts.push(t.name);
    for (const m of profile.teamMemberships) {
      if (m.role !== "leader") parts.push(m.name);
    }
    return parts.length > 0 ? parts.join(", ") : null;
  }

  static async getDelegatableWorkers(
    companyId: number,
    actorUserId: number,
    actorRole: string
  ): Promise<DelegatableWorkerRow[]> {
    const scope = await this.getDelegatableUserIds(companyId, actorUserId, actorRole);
    const cache = await this.loadCompanyOrgCache(companyId);

    const targetIds =
      scope === "all"
        ? [...cache.usersById.values()]
            .filter((u) => u.isActive && u.role === "worker")
            .map((u) => u.id)
        : scope;

    const profiles = scope === "all" ? await this.getOrgProfilesForCompany(companyId) : null;

    return targetIds
      .map((id) => {
        const u = cache.usersById.get(id);
        if (!u) return null;
        const profile = profiles?.get(id) ?? this.buildUserOrgProfile(id, cache);
        return {
          id: u.id,
          fullName: u.fullName,
          orgLabel: this.buildOrgLabel(profile),
        };
      })
      .filter((r): r is DelegatableWorkerRow => r !== null)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pl"));
  }

  static async assertCanDelegateTo(
    companyId: number,
    actorUserId: number,
    actorRole: string,
    targetUserId: number
  ): Promise<void> {
    const scope = await this.getDelegatableUserIds(companyId, actorUserId, actorRole);
    if (scope === "all") return;

    if (!scope.includes(targetUserId)) {
      throw new Error("forbidden");
    }
  }

  static async assertHasDelegationRights(
    companyId: number,
    actorUserId: number,
    actorRole: string
  ): Promise<void> {
    if (actorRole === "admin") return;
    const ok = await this.hasDelegationRights(companyId, actorUserId);
    if (!ok) throw new Error("forbidden");
  }
}
