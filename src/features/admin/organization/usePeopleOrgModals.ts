"use client";

import type { DepartmentTreeNode } from "@/types/organization";
import {
  useDeptModalPart,
  useMemberModalPart,
  useTeamModalPart,
  type DeptModalState,
  type OrgModalPartArgs,
  type TeamModalState,
} from "./usePeopleOrgModalParts";

export type { DeptModalState, TeamModalState } from "./usePeopleOrgModalParts";

export interface PeopleOrgModalsController {
  deptModal: DeptModalState | null;
  setDeptModal: (state: DeptModalState | null) => void;
  deptName: string;
  setDeptName: (value: string) => void;
  deptParentId: number | null;
  setDeptParentId: (value: number | null) => void;
  openCreateDepartment: (parentId: number | null) => void;
  openEditDepartment: (department: DepartmentTreeNode) => void;
  saveDepartment: () => Promise<void>;
  deleteDepartment: (department: DepartmentTreeNode) => Promise<void>;
  teamModal: TeamModalState | null;
  setTeamModal: (state: TeamModalState | null) => void;
  teamName: string;
  setTeamName: (value: string) => void;
  teamLeaderId: number | null;
  setTeamLeaderId: (value: number | null) => void;
  openCreateTeam: (departmentId: number) => void;
  openEditTeam: (team: DepartmentTreeNode["teams"][number]) => void;
  saveTeam: () => Promise<void>;
  deleteTeam: (team: DepartmentTreeNode["teams"][number]) => Promise<void>;
  memberModalOpen: boolean;
  setMemberModalOpen: (open: boolean) => void;
  memberUserId: number | null;
  setMemberUserId: (value: number | null) => void;
  memberRole: string;
  setMemberRole: (value: string) => void;
  openAddMember: (teamId: number) => void;
  saveMember: () => Promise<void>;
  deleteMember: (memberId: number) => Promise<void>;
}

export function usePeopleOrgModals(args: OrgModalPartArgs): PeopleOrgModalsController {
  const dept = useDeptModalPart(args);
  const team = useTeamModalPart(args);
  const member = useMemberModalPart(args);
  return { ...dept, ...team, ...member };
}
