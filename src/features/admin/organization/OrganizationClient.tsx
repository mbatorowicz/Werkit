"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Plus, Trash2, Pencil } from "lucide-react";
import { getDictionary } from "@/i18n";
import { adminApi } from "@/lib/appRoutes";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import {
  narrowOrganizationDepartments,
  narrowOrganizationTeamDetail,
  narrowOrganizationTeams,
  type OrganizationDepartmentRow,
  type OrganizationTeamDetail,
  type OrganizationTeamRow,
} from "@/lib/narrow/organization";
import { narrowAdminUserRows, type AdminUserListRow } from "@/lib/narrow/admin";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { flattenDepartmentTree } from "./organizationTree";

type DeptModalState =
  | { mode: "create"; parentId: number | null }
  | { mode: "edit"; department: OrganizationDepartmentRow };

type TeamModalState =
  | { mode: "create"; departmentId: number }
  | { mode: "edit"; team: OrganizationTeamRow };

export default function OrganizationClient() {
  const { canMutate } = useAdminAbility();
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const dictionary = getDictionary();
  const dict = dictionary.admin.organization;
  const ui = dictionary.admin.ui;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [departments, setDepartments] = useState<OrganizationDepartmentRow[]>([]);
  const [teams, setTeams] = useState<OrganizationTeamRow[]>([]);
  const [users, setUsers] = useState<AdminUserListRow[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teamDetail, setTeamDetail] = useState<OrganizationTeamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deptModal, setDeptModal] = useState<DeptModalState | null>(null);
  const [teamModal, setTeamModal] = useState<TeamModalState | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const [deptName, setDeptName] = useState("");
  const [deptParentId, setDeptParentId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamLeaderId, setTeamLeaderId] = useState<number | null>(null);
  const [memberUserId, setMemberUserId] = useState<number | null>(null);
  const [memberRole, setMemberRole] = useState("member");

  const departmentTree = useMemo(() => flattenDepartmentTree(departments), [departments]);

  const teamsForDepartment = useMemo(
    () => teams.filter((t) => t.departmentId === selectedDepartmentId),
    [teams, selectedDepartmentId]
  );

  const workerUsers = useMemo(
    () => users.filter((u) => u.isActive && (u.role === "worker" || u.role === "admin")),
    [users]
  );

  const fetchDepartments = useCallback(async () => {
    const res = await fetchWithDeviceTelemetry(
      "Admin organization: departments",
      adminApi.organization.departments,
      { cache: "no-store" },
      { category: "admin" }
    );
    const data = await parseJsonArray(res);
    return narrowOrganizationDepartments(data);
  }, []);

  const fetchTeams = useCallback(async () => {
    const res = await fetchWithDeviceTelemetry(
      "Admin organization: teams",
      adminApi.organization.teams,
      { cache: "no-store" },
      { category: "admin" }
    );
    const data = await parseJsonArray(res);
    return narrowOrganizationTeams(data);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetchWithDeviceTelemetry(
      "Admin organization: users",
      adminApi.users,
      { cache: "no-store" },
      { category: "admin" }
    );
    const data = await parseJsonArray(res);
    return narrowAdminUserRows(data);
  }, []);

  const fetchTeamDetail = useCallback(async (teamId: number) => {
    const res = await fetchWithDeviceTelemetry(
      "Admin organization: team detail",
      adminApi.organization.team(teamId),
      { cache: "no-store" },
      { category: "admin" }
    );
    const data = await parseJsonUnknown(res);
    return narrowOrganizationTeamDetail(data);
  }, []);

  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [depts, teamRows, userRows] = await Promise.all([
        fetchDepartments(),
        fetchTeams(),
        fetchUsers(),
      ]);
      setDepartments(depts);
      setTeams(teamRows);
      setUsers(userRows);

      setSelectedDepartmentId((prev) => {
        if (prev && depts.some((d) => d.id === prev)) return prev;
        return depts[0]?.id ?? null;
      });
      setSelectedTeamId((prev) => {
        if (prev && teamRows.some((t) => t.id === prev)) return prev;
        const firstDept = depts[0]?.id;
        return firstDept ? (teamRows.find((t) => t.departmentId === firstDept)?.id ?? null) : null;
      });
    } catch {
      /* sieć */
    }
    setIsLoading(false);
  }, [fetchDepartments, fetchTeams, fetchUsers]);

  useEffect(() => {
    queueMicrotask(() => {
      void reloadAll();
    });
  }, [reloadAll]);

  useEffect(() => {
    if (!selectedTeamId) {
      setTeamDetail(null);
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      void fetchTeamDetail(selectedTeamId).then((detail) => {
        if (!cancelled) setTeamDetail(detail);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId, fetchTeamDetail, teams]);

  async function handleApiError(res: Response, fallback: string) {
    const body = await parseJsonUnknown(res);
    const err = readApiErrorString(body);
    await appAlert({ message: appDialogApiMessage(apiErrors, err, fallback) });
  }

  function openCreateDepartment() {
    setDeptName("");
    setDeptParentId(selectedDepartmentId);
    setDeptModal({ mode: "create", parentId: selectedDepartmentId });
  }

  function openEditDepartment(department: OrganizationDepartmentRow) {
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

  async function deleteDepartment(department: OrganizationDepartmentRow) {
    if (!(await appConfirm({ message: dict.deleteDepartmentConfirm, variant: "danger" }))) {
      return;
    }
    const res = await fetch(adminApi.organization.department(department.id), { method: "DELETE" });
    if (!res.ok) {
      await handleApiError(res, apiErrors.delete_error ?? "Błąd usuwania.");
      return;
    }
    if (selectedDepartmentId === department.id) {
      setSelectedDepartmentId(null);
      setSelectedTeamId(null);
    }
    await reloadAll();
    await appAlert({ message: dict.deleteSuccess });
  }

  function openCreateTeam() {
    if (!selectedDepartmentId) return;
    setTeamName("");
    setTeamLeaderId(null);
    setTeamModal({ mode: "create", departmentId: selectedDepartmentId });
  }

  function openEditTeam(team: OrganizationTeamRow) {
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
      const saved = await parseJsonUnknown(res);
      const savedTeam = narrowOrganizationTeams([saved])[0];
      setTeamModal(null);
      await reloadAll();
      if (savedTeam) setSelectedTeamId(savedTeam.id);
      await appAlert({ message: dict.saveSuccess });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTeam(team: OrganizationTeamRow) {
    if (!(await appConfirm({ message: dict.deleteTeamConfirm, variant: "danger" }))) return;
    const res = await fetch(adminApi.organization.team(team.id), { method: "DELETE" });
    if (!res.ok) {
      await handleApiError(res, apiErrors.delete_error ?? "Błąd usuwania.");
      return;
    }
    if (selectedTeamId === team.id) setSelectedTeamId(null);
    await reloadAll();
    await appAlert({ message: dict.deleteSuccess });
  }

  function openAddMember() {
    setMemberUserId(null);
    setMemberRole("member");
    setMemberModalOpen(true);
  }

  async function saveMember() {
    if (!selectedTeamId || !memberUserId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(adminApi.organization.teamMembers, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selectedTeamId, userId: memberUserId, role: memberRole }),
      });
      if (!res.ok) {
        await handleApiError(res, apiErrors.save_error ?? "Błąd zapisu.");
        return;
      }
      setMemberModalOpen(false);
      const detail = await fetchTeamDetail(selectedTeamId);
      setTeamDetail(detail);
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
    if (selectedTeamId) {
      const detail = await fetchTeamDetail(selectedTeamId);
      setTeamDetail(detail);
    }
    await appAlert({ message: dict.deleteSuccess });
  }

  const panelClass =
    "rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col min-h-[280px]";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Building2 className="h-7 w-7 text-emerald-600" aria-hidden />
          {dict.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dict.subtitle}</p>
      </header>

      {isLoading ? (
        <p className="text-sm text-zinc-500">{dict.fetching}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <section className={panelClass}>
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                {dict.departments}
              </h2>
              {canMutate && (
                <button
                  type="button"
                  onClick={openCreateDepartment}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {dict.addDepartment}
                </button>
              )}
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {departmentTree.length === 0 ? (
                <li className="px-2 py-4 text-sm text-zinc-500">{dict.noDepartments}</li>
              ) : (
                departmentTree.map((dept) => (
                  <li key={dept.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDepartmentId(dept.id);
                        const firstTeam = teams.find((t) => t.departmentId === dept.id);
                        setSelectedTeamId(firstTeam?.id ?? null);
                      }}
                      className={`flex-1 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                        selectedDepartmentId === dept.id
                          ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                      }`}
                      style={{ paddingLeft: `${8 + dept.depth * 16}px` }}
                    >
                      {dept.name}
                    </button>
                    {canMutate && selectedDepartmentId === dept.id && (
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEditDepartment(dept)}
                          className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          aria-label={dict.editDepartment}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteDepartment(dept)}
                          className="rounded p-1 text-zinc-400 hover:text-red-600"
                          aria-label={dict.deleteDepartment}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className={panelClass}>
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{dict.teams}</h2>
              {canMutate && selectedDepartmentId && (
                <button
                  type="button"
                  onClick={openCreateTeam}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {dict.addTeam}
                </button>
              )}
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {!selectedDepartmentId ? (
                <li className="px-2 py-4 text-sm text-zinc-500">{dict.noDepartments}</li>
              ) : teamsForDepartment.length === 0 ? (
                <li className="px-2 py-4 text-sm text-zinc-500">{dict.noTeams}</li>
              ) : (
                teamsForDepartment.map((team) => (
                  <li key={team.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`flex-1 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedTeamId === team.id
                          ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                      }`}
                    >
                      {team.name}
                    </button>
                    {canMutate && selectedTeamId === team.id && (
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEditTeam(team)}
                          className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                          aria-label={dict.editTeam}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteTeam(team)}
                          className="rounded p-1 text-zinc-400 hover:text-red-600"
                          aria-label={dict.deleteTeam}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className={panelClass}>
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{dict.members}</h2>
              {canMutate && selectedTeamId && (
                <button
                  type="button"
                  onClick={openAddMember}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {dict.addMember}
                </button>
              )}
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              {!selectedTeamId ? (
                <li className="px-2 py-4 text-sm text-zinc-500">{dict.noTeams}</li>
              ) : !teamDetail?.members.length ? (
                <li className="px-2 py-4 text-sm text-zinc-500">{dict.noMembers}</li>
              ) : (
                teamDetail.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300"
                  >
                    <div>
                      <p className="font-medium">{member.user.fullName}</p>
                      <p className="text-xs text-zinc-500">
                        {member.role === "leader" ? dict.roleLeader : dict.roleMember}
                      </p>
                    </div>
                    {canMutate && (
                      <button
                        type="button"
                        onClick={() => void deleteMember(member.id)}
                        className="rounded p-1 text-zinc-400 hover:text-red-600"
                        aria-label={dict.deleteMember}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}

      {deptModal && (
        <AdminModalShell
          open
          onClose={() => setDeptModal(null)}
          title={deptModal.mode === "create" ? dict.addDepartment : dict.editDepartment}
          maxWidthClass="max-w-md"
          closeOnBackdropClick={false}
          footer={
            <FormModalFooter
              formId="admin-org-dept-form"
              onCancel={() => setDeptModal(null)}
              isSubmitting={isSubmitting}
              submitLabel={dictionary.admin.categories.shared.save}
              cancelLabel={ui.modalCancel}
            />
          }
        >
          <form
            id="admin-org-dept-form"
            onSubmit={(e) => {
              e.preventDefault();
              void saveDepartment();
            }}
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.departmentName}</span>
              <input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder={dict.departmentNamePlaceholder}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="mt-4 block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.parentDepartment}</span>
              <select
                value={deptParentId ?? ""}
                onChange={(e) => setDeptParentId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">{dict.parentDepartmentNone}</option>
                {departments
                  .filter((d) => deptModal.mode !== "edit" || d.id !== deptModal.department.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </label>
          </form>
        </AdminModalShell>
      )}

      {teamModal && (
        <AdminModalShell
          open
          onClose={() => setTeamModal(null)}
          title={teamModal.mode === "create" ? dict.addTeam : dict.editTeam}
          maxWidthClass="max-w-md"
          closeOnBackdropClick={false}
          footer={
            <FormModalFooter
              formId="admin-org-team-form"
              onCancel={() => setTeamModal(null)}
              isSubmitting={isSubmitting}
              submitLabel={dictionary.admin.categories.shared.save}
              cancelLabel={ui.modalCancel}
            />
          }
        >
          <form
            id="admin-org-team-form"
            onSubmit={(e) => {
              e.preventDefault();
              void saveTeam();
            }}
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.teamName}</span>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={dict.teamNamePlaceholder}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
            <label className="mt-4 block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.leader}</span>
              <select
                value={teamLeaderId ?? ""}
                onChange={(e) => setTeamLeaderId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">—</option>
                {workerUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </label>
          </form>
        </AdminModalShell>
      )}

      {memberModalOpen && (
        <AdminModalShell
          open
          onClose={() => setMemberModalOpen(false)}
          title={dict.addMember}
          maxWidthClass="max-w-md"
          closeOnBackdropClick={false}
          footer={
            <FormModalFooter
              formId="admin-org-member-form"
              onCancel={() => setMemberModalOpen(false)}
              isSubmitting={isSubmitting}
              submitLabel={dictionary.admin.categories.shared.save}
              cancelLabel={ui.modalCancel}
            />
          }
        >
          <form
            id="admin-org-member-form"
            onSubmit={(e) => {
              e.preventDefault();
              void saveMember();
            }}
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.selectWorker}</span>
              <select
                value={memberUserId ?? ""}
                onChange={(e) => setMemberUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">—</option>
                {workerUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.role}</span>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="leader">{dict.roleLeader}</option>
                <option value="member">{dict.roleMember}</option>
              </select>
            </label>
          </form>
        </AdminModalShell>
      )}
    </div>
  );
}
