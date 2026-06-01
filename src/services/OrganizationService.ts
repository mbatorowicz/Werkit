// ============================================================
// Werkit — Serwis: hierarchia organizacyjna (departamenty / zespoły)
// ============================================================

import { db } from "@/db";
import { departments, teams, teamMembers, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { DepartmentTreeNode, TeamWithMembers, TeamMemberWithUser } from "@/types/organization";

export class OrganizationService {
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
  static async getDepartmentTree(companyId: number): Promise<DepartmentTreeNode[]> {
    const allDepts = await this.getDepartments(companyId);
    const allTeams = await this.getTeams(companyId);

    // Zbuduj mapę zespołów z członkami
    const teamMap = new Map<number, TeamWithMembers>();
    for (const team of allTeams) {
      const members = await this.getTeamMembersWithUsers(team.id);
      teamMap.set(team.id, { ...team, members });
    }

    // Zbuduj drzewo departamentów
    const nodeMap = new Map<number, DepartmentTreeNode>();
    const roots: DepartmentTreeNode[] = [];

    for (const dept of allDepts) {
      nodeMap.set(dept.id, {
        ...dept,
        children: [],
        teams: allTeams
          .filter((t) => t.departmentId === dept.id)
          .map((t) => teamMap.get(t.id)!)
          .filter((t): t is TeamWithMembers => !!t),
      });
    }

    for (const [deptId, node] of nodeMap) {
      const dept = allDepts.find((d) => d.id === deptId)!;
      if (dept.parentId && nodeMap.has(dept.parentId)) {
        nodeMap.get(dept.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
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
    const [inserted] = await db
      .insert(teamMembers)
      .values({
        teamId: data.teamId,
        userId: data.userId,
        role: data.role ?? "member",
      })
      .returning();

    return inserted;
  }

  /**
   * Aktualizuje rolę członka zespołu.
   */
  static async updateTeamMember(id: number, data: { role?: string }) {
    const [updated] = await db
      .update(teamMembers)
      .set({
        ...(data.role !== undefined ? { role: data.role } : {}),
      })
      .where(eq(teamMembers.id, id))
      .returning();

    return updated;
  }

  /**
   * Usuwa członka z zespołu.
   */
  static async removeTeamMember(id: number) {
    const [deleted] = await db.delete(teamMembers).where(eq(teamMembers.id, id)).returning();

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
