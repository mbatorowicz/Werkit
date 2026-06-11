"use client";

import { useState } from "react";
import { useDictionary } from "@/i18n";
import { adminApi } from "@/lib/appRoutes";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import type { OrganizationDepartmentRow, OrganizationTeamRow } from "@/lib/narrow/organization";
import type { DepartmentTreeNode } from "@/types/organization";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";

export type DeptModalState =
  | { mode: "create"; parentId: number | null }
  | { mode: "edit"; department: OrganizationDepartmentRow | DepartmentTreeNode };

export type TeamModalState =
  | { mode: "create"; departmentId: number }
  | { mode: "edit"; team: OrganizationTeamRow | DepartmentTreeNode["teams"][number] };

interface UsePeopleOrgModalsArgs {
  reloadAll: () => Promise<void>;
  setIsSubmitting: (value: boolean) => void;
}

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

export function usePeopleOrgModals({
  reloadAll,
  setIsSubmitting,
}: UsePeopleOrgModalsArgs): PeopleOrgModalsController {
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const dictionary = useDictionary();
  const dict = dictionary.admin.organization;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [deptModal, setDeptModal] = useState<DeptModalState | null>(null);
  const [teamModal, setTeamModal] = useState<TeamModalState | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberTeamId, setMemberTeamId] = useState<number | null>(null);

  const [deptName, setDeptName] = useState("");
  const [deptParentId, setDeptParentId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamLeaderId, setTeamLeaderId] = useState<number | null>(null);
  const [memberUserId, setMemberUserId] = useState<number | null>(null);
  const [memberRole, setMemberRole] = useState("member");

  async function handleApiError(res: Response, fallback: string) {
    const body = await parseJsonUnknown(res);
    const err = readApiErrorString(body);
    await appAlert({ message: appDialogApiMessage(apiErrors, err, fallback) });
  }

  function openCreateDepartment(parentId: number | null) {
    setDeptName("");
    setDeptParentId(parentId);
    setDeptModal({ mode: "create", parentId });
  }

  function openEditDepartment(department: DepartmentTreeNode) {
    setDeptName(department.name);
    setDeptParentId(department.parentId);
    setDeptModal({ mode: "edit", department });
  }

  async function saveDepartment() {
    const name = deptName.trim();
    if (!name) return;
    setIsSubmitting(true);
    try {
      const body = { name, parentId: deptParentId };
      const res =
        deptModal?.mode === "edit"
          ? await fetch(adminApi.organization.department(deptModal.department.id), {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          : await fetch(adminApi.organization.departments, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
      if (!res.ok) {
        await handleApiError(res, apiErrors.save_error ?? "Błąd zapisu.");
        return;
      }
      setDeptModal(null);
      await reloadAll();
      await appAlert({ message: dict.saveSuccess });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteDepartment(department: DepartmentTreeNode) {
    if (!(await appConfirm({ message: dict.deleteDepartmentConfirm, variant: "danger" }))) {
      return;
    }
    const res = await fetch(adminApi.organization.department(department.id), { method: "DELETE" });
    if (!res.ok) {
      await handleApiError(res, apiErrors.delete_error ?? "Błąd usuwania.");
      return;
    }
    await reloadAll();
    await appAlert({ message: dict.deleteSuccess });
  }

  function openCreateTeam(departmentId: number) {
    setTeamName("");
    setTeamLeaderId(null);
    setTeamModal({ mode: "create", departmentId });
  }

  function openEditTeam(team: DepartmentTreeNode["teams"][number]) {
    setTeamName(team.name);
    setTeamLeaderId(team.leaderId);
    setTeamModal({ mode: "edit", team });
  }

  async function saveTeam() {
    const name = teamName.trim();
    if (!name || !teamModal) return;
    setIsSubmitting(true);
    try {
      const body =
        teamModal.mode === "create"
          ? { name, departmentId: teamModal.departmentId, leaderId: teamLeaderId }
          : { name, leaderId: teamLeaderId };
      const res =
        teamModal.mode === "edit"
          ? await fetch(adminApi.organization.team(teamModal.team.id), {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            })
          : await fetch(adminApi.organization.teams, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
      if (!res.ok) {
        await handleApiError(res, apiErrors.save_error ?? "Błąd zapisu.");
        return;
      }
      setTeamModal(null);
      await reloadAll();
      await appAlert({ message: dict.saveSuccess });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTeam(team: DepartmentTreeNode["teams"][number]) {
    if (!(await appConfirm({ message: dict.deleteTeamConfirm, variant: "danger" }))) return;
    const res = await fetch(adminApi.organization.team(team.id), { method: "DELETE" });
    if (!res.ok) {
      await handleApiError(res, apiErrors.delete_error ?? "Błąd usuwania.");
      return;
    }
    await reloadAll();
    await appAlert({ message: dict.deleteSuccess });
  }

  function openAddMember(teamId: number) {
    setMemberTeamId(teamId);
    setMemberUserId(null);
    setMemberRole("member");
    setMemberModalOpen(true);
  }

  async function saveMember() {
    if (!memberTeamId || !memberUserId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(adminApi.organization.teamMembers, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: memberTeamId, userId: memberUserId, role: memberRole }),
      });
      if (!res.ok) {
        await handleApiError(res, apiErrors.save_error ?? "Błąd zapisu.");
        return;
      }
      setMemberModalOpen(false);
      await reloadAll();
      await appAlert({ message: dict.saveSuccess });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteMember(memberId: number) {
    if (!(await appConfirm({ message: dict.deleteMemberConfirm, variant: "danger" }))) return;
    const res = await fetch(adminApi.organization.teamMember(memberId), { method: "DELETE" });
    if (!res.ok) {
      await handleApiError(res, apiErrors.delete_error ?? "Błąd usuwania.");
      return;
    }
    await reloadAll();
    await appAlert({ message: dict.deleteSuccess });
  }

  return {
    deptModal,
    setDeptModal,
    deptName,
    setDeptName,
    deptParentId,
    setDeptParentId,
    openCreateDepartment,
    openEditDepartment,
    saveDepartment,
    deleteDepartment,
    teamModal,
    setTeamModal,
    teamName,
    setTeamName,
    teamLeaderId,
    setTeamLeaderId,
    openCreateTeam,
    openEditTeam,
    saveTeam,
    deleteTeam,
    memberModalOpen,
    setMemberModalOpen,
    memberUserId,
    setMemberUserId,
    memberRole,
    setMemberRole,
    openAddMember,
    saveMember,
    deleteMember,
  };
}
