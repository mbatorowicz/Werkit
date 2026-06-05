// ============================================================
// Werkit — Hierarchia organizacyjna (Departamenty / Zespoły)
// ============================================================

/**
 * Departament w organizacji.
 * Może być hierarchiczny (parentId → departament nadrzędny).
 * Kolumny zgodne z `src/db/schema.ts`.
 */
export type Department = {
  id: number;
  companyId: number;
  name: string;
  parentId: number | null;
  managerId: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
};

/** Input do utworzenia / edycji departamentu. */
export type DepartmentInput = {
  name: string;
  parentId?: number | null;
  managerId?: number | null;
};

/**
 * Zespół w ramach departamentu.
 * Kolumny zgodne z `src/db/schema.ts`.
 */
export type Team = {
  id: number;
  companyId: number;
  departmentId: number;
  name: string;
  leaderId: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
};

/** Input do utworzenia / edycji zespołu. */
export type TeamInput = {
  departmentId: number;
  name: string;
  leaderId?: number | null;
};

/**
 * Członek zespołu (N:M).
 * Kolumny zgodne z `src/db/schema.ts`.
 */
export type TeamMember = {
  id: number;
  teamId: number;
  userId: number;
  role: string;
  joinedAt: Date;
};

/** Input do dodania członka do zespołu. */
export type TeamMemberInput = {
  teamId: number;
  userId: number;
  role?: string;
};

/**
 * Rozszerzona struktura departamentu z poddrzewem (do UI drzewa).
 */
export type DepartmentTreeNode = Department & {
  children: DepartmentTreeNode[];
  teams: TeamWithMembers[];
};

/**
 * Zespół z członkami (do UI).
 */
export type TeamWithMembers = Team & {
  members: TeamMemberWithUser[];
};

/**
 * TeamMember z danymi użytkownika.
 */
export type TeamMemberWithUser = TeamMember & {
  user: {
    id: number;
    fullName: string;
    usernameEmail: string;
  };
};

/** Krótki opis pozycji w strukturze (badge w UI). */
export type OrgPositionRef = {
  id: number;
  name: string;
};

export type TeamMembershipRef = OrgPositionRef & {
  teamId: number;
  departmentName: string | null;
  role: string;
};

/** Profil organizacyjny użytkownika — pochodny z departments / teams / team_members. */
export type UserOrgProfile = {
  deptManagerOf: OrgPositionRef[];
  teamLeaderOf: OrgPositionRef[];
  teamMemberships: TeamMembershipRef[];
  supervisorChain: { userId: number; fullName: string; kind: "team_leader" | "dept_manager" }[];
};

/** Wiersz pracownika do pickera delegacji. */
export type DelegatableWorkerRow = {
  id: number;
  fullName: string;
  orgLabel: string | null;
};
