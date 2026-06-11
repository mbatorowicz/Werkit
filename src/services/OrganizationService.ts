// ============================================================
// Werkit — Serwis: hierarchia organizacyjna (departamenty / zespoły)
// ============================================================

import { db } from "@/db";
import { departments, teams, teamMembers, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { buildHierarchyTree } from "@/lib/hierarchyTree";
import type { DepartmentTreeNode, TeamWithMembers, TeamMemberWithUser } from "@/types/organization";

export class OrganizationService {
  /** SSOT: `teams.leaderId` — synchronizuje wpis `team_members` z `role='leader'`. */
  private static async syncTeamLeader(teamId: number, leaderId: number | null) {
    const members = await db
      .select({ id: teamMembers.id, userId: teamMembers.userId, role: teamMembers.role })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    for (const m of members) {
      if (m.role === "leader" && m.userId !== leaderId) {
        await db.update(teamMembers).set({ role: "member" }).where(eq(teamMembers.id, m.id));
      }
    }

    if (leaderId == null) return;

    const existing = members.find((m) => m.userId === leaderId);
    if (existing) {
      if (existing.role !== "leader") {
        await db.update(teamMembers).set({ role: "leader" }).where(eq(teamMembers.id, existing.id));
      }
      return;
    }

    await db.insert(teamMembers).values({
      teamId,
      userId: leaderId,
      role: "leader",
    });
  }

  private static async applyTeamLeaderFromMember(teamId: number, userId: number) {
    await db.update(teams).set({ leaderId: userId }).where(eq(teams.id, teamId));
    await this.syncTeamLeader(teamId, userId);
  }

  private static async clearTeamLeaderIfMatches(teamId: number, userId: number) {
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (team?.leaderId === userId) {
      await db.update(teams).set({ leaderId: null }).where(eq(teams.id, teamId));
    }
  }
  // ==================== DEPARTAMENTY ====================

  /**
   * Pobiera wszystkie departamenty firmy (płaska lista).
   */
  static async getDepartments(companyId: number) {
    return db
      .select()
      .from(departments)
      .where(eq(departments.companyId, companyId))
      .orderBy(departments.sortOrder, departments.name);
  }

  /**
   * Pobiera departament jako drzewo (parent → children).
   */
  /** Wszyscy członkowie zespołów firmy (jedno zapytanie). */
  static async getAllTeamMembersWithUsers(companyId: number): Promise<TeamMemberWithUser[]> {
    const rows = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          usernameEmail: users.usernameEmail,
        },
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teams.companyId, companyId));

    return rows.map((r) => ({
      id: r.id,
      teamId: r.teamId,
      userId: r.userId,
      role: r.role,
      joinedAt: r.joinedAt,
      user: r.user,
    }));
  }

  static async getDepartmentTree(companyId: number): Promise<DepartmentTreeNode[]> {
    const [allDepts, allTeams, allMembers] = await Promise.all([
      this.getDepartments(companyId),
      this.getTeams(companyId),
      this.getAllTeamMembersWithUsers(companyId),
    ]);

    const membersByTeam = new Map<number, TeamMemberWithUser[]>();
    for (const m of allMembers) {
      const bucket = membersByTeam.get(m.teamId);
      if (bucket) bucket.push(m);
      else membersByTeam.set(m.teamId, [m]);
    }

    const teamMap = new Map<number, TeamWithMembers>();
    for (const team of allTeams) {
      teamMap.set(team.id, { ...team, members: membersByTeam.get(team.id) ?? [] });
    }

    const deptHierarchy = buildHierarchyTree(allDepts);

    const attachTeamsAndChildren = (node: (typeof deptHierarchy)[number]): DepartmentTreeNode => {
      const children = node.children.map(attachTeamsAndChildren);
      return {
        ...node,
        children,
        teams: allTeams
          .filter((t) => t.departmentId === node.id)
          .sort((a, b) => {
            const so = a.sortOrder - b.sortOrder;
            if (so !== 0) return so;
            return a.name.localeCompare(b.name, "pl");
          })
          .map((t) => teamMap.get(t.id)!)
          .filter((t): t is TeamWithMembers => !!t),
      };
    };

    return deptHierarchy.map(attachTeamsAndChildren);
  }

  /** Aktywni workerzy bez członkostwa w żadnym zespole firmy. */
  static async getUnassignedWorkers(companyId: number) {
    const [allUsers, allMembers] = await Promise.all([
      db
        .select({
          id: users.id,
          fullName: users.fullName,
          role: users.role,
        })
        .from(users)
        .where(
          and(eq(users.companyId, companyId), eq(users.role, "worker"), eq(users.isActive, true))
        ),
      this.getAllTeamMembersWithUsers(companyId),
    ]);
    const assigned = new Set(allMembers.map((m) => m.userId));
    return allUsers.filter((u) => !assigned.has(u.id));
  }

  /** Pierwszy zespół użytkownika w firmie (do formularza konta). */
  static async getUserPrimaryTeamId(companyId: number, userId: number): Promise<number | null> {
    const [row] = await db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, userId), eq(teams.companyId, companyId)))
      .limit(1);
    return row?.teamId ?? null;
  }

  /**
   * Przypisanie konta do jednego zespołu z formularza (zastępuje wcześniejsze członkostwa w firmie).
   */
  static async replaceUserTeamAssignment(
    companyId: number,
    userId: number,
    teamId: number | null
  ): Promise<void> {
    const companyTeams = await this.getTeams(companyId);
    const companyTeamIds = companyTeams.map((t) => t.id);
    if (companyTeamIds.length > 0) {
      await db
        .delete(teamMembers)
        .where(and(eq(teamMembers.userId, userId), inArray(teamMembers.teamId, companyTeamIds)));
    }
    if (teamId == null) return;

    const team = companyTeams.find((t) => t.id === teamId);
    if (!team) throw new Error("invalid_team");

    await this.addTeamMember({ teamId, userId, role: "member" });
  }

  /**
   * Pobiera departament po ID.
   */
  static async getDepartment(companyId: number, id: number) {
    const [dept] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, id), eq(departments.companyId, companyId)))
      .limit(1);

    return dept ?? null;
  }

  /**
   * Tworzy nowy departament.
   */
  static async createDepartment(
    companyId: number,
    data: {
      name: string;
      parentId?: number | null;
      managerId?: number | null;
    }
  ) {
    const [inserted] = await db
      .insert(departments)
      .values({
        companyId,
        name: data.name.trim(),
        parentId: data.parentId ?? null,
        managerId: data.managerId ?? null,
      })
      .returning();

    return inserted;
  }

  /**
   * Aktualizuje departament.
   */
  static async updateDepartment(
    id: number,
    data: {
      name?: string;
      parentId?: number | null;
      managerId?: number | null;
    }
  ) {
    const [updated] = await db
      .update(departments)
      .set({
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
      })
      .where(eq(departments.id, id))
      .returning();

    return updated;
  }

  /**
   * Usuwa departament (kaskadowo usuwa też zespoły i członków).
   */
  static async deleteDepartment(id: number) {
    const [deleted] = await db.delete(departments).where(eq(departments.id, id)).returning();

    return deleted;
  }

  // ==================== ZESPOŁY ====================

  /**
   * Pobiera wszystkie zespoły firmy (przez join z departamentami).
   */
  static async getTeams(companyId: number) {
    return db
      .select()
      .from(teams)
      .innerJoin(departments, eq(teams.departmentId, departments.id))
      .where(eq(departments.companyId, companyId))
      .then((rows) => rows.map((r) => r.teams));
  }

  /**
   * Pobiera zespoły dla danego departamentu.
   */
  static async getTeamsByDepartment(departmentId: number) {
    return db
      .select()
      .from(teams)
      .where(eq(teams.departmentId, departmentId))
      .orderBy(teams.sortOrder, teams.name);
  }

  /**
   * Pobiera zespół po ID.
   */
  static async getTeam(id: number) {
    const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);

    return team ?? null;
  }

  /**
   * Tworzy nowy zespół.
   */
  static async createTeam(
    companyId: number,
    data: {
      departmentId: number;
      name: string;
      leaderId?: number | null;
    }
  ) {
    const [inserted] = await db
      .insert(teams)
      .values({
        companyId,
        departmentId: data.departmentId,
        name: data.name.trim(),
        leaderId: data.leaderId ?? null,
      })
      .returning();

    if (inserted.leaderId) {
      await this.syncTeamLeader(inserted.id, inserted.leaderId);
    }

    return inserted;
  }

  /**
   * Aktualizuje zespół.
   */
  static async updateTeam(
    id: number,
    data: {
      name?: string;
      leaderId?: number | null;
    }
  ) {
    const [updated] = await db
      .update(teams)
      .set({
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.leaderId !== undefined ? { leaderId: data.leaderId } : {}),
      })
      .where(eq(teams.id, id))
      .returning();

    if (updated && data.leaderId !== undefined) {
      await this.syncTeamLeader(id, data.leaderId);
    }

    return updated;
  }

  /**
   * Usuwa zespół (kaskadowo usuwa członków).
   */
  static async deleteTeam(id: number) {
    const [deleted] = await db.delete(teams).where(eq(teams.id, id)).returning();

    return deleted;
  }

  // ==================== CZŁONKOWIE ZESPOŁU ====================

  /**
   * Pobiera członków zespołu z danymi użytkownika.
   */
  static async getTeamMembersWithUsers(teamId: number): Promise<TeamMemberWithUser[]> {
    const rows = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        user: {
          id: users.id,
          fullName: users.fullName,
          usernameEmail: users.usernameEmail,
        },
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));

    return rows.map((r) => ({
      id: r.id,
      teamId: r.teamId,
      userId: r.userId,
      role: r.role,
      joinedAt: r.joinedAt,
      user: {
        id: r.user.id,
        fullName: r.user.fullName,
        usernameEmail: r.user.usernameEmail,
      },
    }));
  }

  /**
   * Dodaje użytkownika do zespołu.
   */
  static async addTeamMember(data: { teamId: number; userId: number; role?: string }) {
    const role = data.role ?? "member";
    const [inserted] = await db
      .insert(teamMembers)
      .values({
        teamId: data.teamId,
        userId: data.userId,
        role,
      })
      .returning();

    if (role === "leader") {
      await this.applyTeamLeaderFromMember(data.teamId, data.userId);
    }

    return inserted;
  }

  /**
   * Aktualizuje rolę członka zespołu.
   */
  static async updateTeamMember(id: number, data: { role?: string }) {
    const [before] = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);

    const [updated] = await db
      .update(teamMembers)
      .set({
        ...(data.role !== undefined ? { role: data.role } : {}),
      })
      .where(eq(teamMembers.id, id))
      .returning();

    if (updated && data.role !== undefined && before) {
      if (data.role === "leader") {
        await this.applyTeamLeaderFromMember(before.teamId, before.userId);
      } else if (before.role === "leader") {
        await this.clearTeamLeaderIfMatches(before.teamId, before.userId);
      }
    }

    return updated;
  }

  /**
   * Usuwa członka z zespołu.
   */
  static async removeTeamMember(id: number) {
    const [deleted] = await db.delete(teamMembers).where(eq(teamMembers.id, id)).returning();

    if (deleted?.role === "leader") {
      await this.clearTeamLeaderIfMatches(deleted.teamId, deleted.userId);
    }

    return deleted;
  }

  /**
   * Pobiera wszystkie zespoły, do których należy użytkownik.
   */
  static async getUserTeams(userId: number) {
    const rows = await db
      .select({
        team: teams,
        department: departments,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .innerJoin(departments, eq(teams.departmentId, departments.id))
      .where(eq(teamMembers.userId, userId));

    return rows;
  }
}
