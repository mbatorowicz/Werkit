"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { getDictionary } from "@/i18n";
import { adminApi } from "@/lib/appRoutes";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import {
  narrowOrganizationDepartments,
  narrowOrganizationTeams,
  narrowOrganizationTreePayload,
  type OrganizationDepartmentRow,
  type OrganizationTeamRow,
} from "@/lib/narrow/organization";
import { narrowAdminUserRows, type AdminUserListRow } from "@/lib/narrow/admin";
import type { DepartmentTreeNode, OrganizationTreePayload } from "@/types/organization";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { INPUT_BASE } from "@/lib/uiTokens";
import UserFormFields, {
  COMBO_NONE,
  emptyUserForm,
  type UserFormState,
} from "@/features/admin/users/UserFormFields";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { OrgHierarchyTree } from "./OrgHierarchyTree";

type DeptModalState =
  | { mode: "create"; parentId: number | null }
  | { mode: "edit"; department: OrganizationDepartmentRow | DepartmentTreeNode };

type TeamModalState =
  | { mode: "create"; departmentId: number }
  | { mode: "edit"; team: OrganizationTeamRow | DepartmentTreeNode["teams"][number] };

const EMPTY_TREE: OrganizationTreePayload = { tree: [], unassignedUsers: [] };

export default function PeopleClient() {
  const { canMutate, gpsEnabled, durEnabled } = useAdminAbility();
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const dictionary = getDictionary();
  const dict = dictionary.admin.organization;
  const workersDict = dictionary.admin.workers;
  const { org: _org, ...workersFlat } = workersDict;
  const formDict = workersFlat as Record<string, string>;
  const ui = dictionary.admin.ui;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [treePayload, setTreePayload] = useState<OrganizationTreePayload>(EMPTY_TREE);
  const [departments, setDepartments] = useState<OrganizationDepartmentRow[]>([]);
  const [teams, setTeams] = useState<OrganizationTeamRow[]>([]);
  const [users, setUsers] = useState<AdminUserListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deptModal, setDeptModal] = useState<DeptModalState | null>(null);
  const [teamModal, setTeamModal] = useState<TeamModalState | null>(null);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberTeamId, setMemberTeamId] = useState<number | null>(null);

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm());

  const [deptName, setDeptName] = useState("");
  const [deptParentId, setDeptParentId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamLeaderId, setTeamLeaderId] = useState<number | null>(null);
  const [memberUserId, setMemberUserId] = useState<number | null>(null);
  const [memberRole, setMemberRole] = useState("member");

  const roleSubtitle = useCallback(
    (role: string) => {
      if (role === "admin") return workersDict.roleAdminShort;
      if (role === "viewer") return workersDict.roleViewerShort;
      return workersDict.roleWorkerShort;
    },
    [workersDict]
  );

  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [treeRes, deptRes, teamRes, userRes] = await Promise.all([
        fetchWithDeviceTelemetry(
          "Admin people: tree",
          adminApi.organization.tree,
          { cache: "no-store" },
          { category: "admin" }
        ),
        fetchWithDeviceTelemetry(
          "Admin people: departments",
          adminApi.organization.departments,
          { cache: "no-store" },
          { category: "admin" }
        ),
        fetchWithDeviceTelemetry(
          "Admin people: teams",
          adminApi.organization.teams,
          { cache: "no-store" },
          { category: "admin" }
        ),
        fetchWithDeviceTelemetry(
          "Admin people: users",
          adminApi.users,
          { cache: "no-store" },
          { category: "admin" }
        ),
      ]);
      const treeBody = await parseJsonUnknown(treeRes);
      const tree = narrowOrganizationTreePayload(treeBody) ?? EMPTY_TREE;
      setTreePayload(tree);
      setDepartments(narrowOrganizationDepartments(await parseJsonArray(deptRes)));
      setTeams(narrowOrganizationTeams(await parseJsonArray(teamRes)));
      setUsers(narrowAdminUserRows(await parseJsonArray(userRes)));
    } catch {
      /* sieć */
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void reloadAll();
    });
  }, [reloadAll]);

  const workerUsers = useMemo(
    () => users.filter((u) => u.isActive && (u.role === "worker" || u.role === "admin")),
    [users]
  );

  const supervisorOptions = useMemo((): AdminSearchComboboxOption[] => {
    const opts: AdminSearchComboboxOption[] = [
      { id: COMBO_NONE, label: workersDict.supervisorNone },
    ];
    for (const u of users) {
      if (!u.isActive || u.id === editUserId) continue;
      opts.push({
        id: String(u.id),
        label: u.fullName,
        sublabel: roleSubtitle(u.role),
        searchText: `${u.fullName} ${u.usernameEmail}`,
      });
    }
    return opts;
  }, [users, editUserId, workersDict.supervisorNone, roleSubtitle]);

  const departmentOptions = useMemo((): AdminSearchComboboxOption[] => {
    const opts: AdminSearchComboboxOption[] = [
      { id: COMBO_NONE, label: workersDict.teamDepartmentNone },
    ];
    for (const d of departments) {
      opts.push({ id: String(d.id), label: d.name });
    }
    return opts;
  }, [departments, workersDict.teamDepartmentNone]);

  const teamOptions = useMemo((): AdminSearchComboboxOption[] => {
    const deptId =
      userForm.departmentId && userForm.departmentId !== COMBO_NONE
        ? parseInt(userForm.departmentId, 10)
        : null;
    const opts: AdminSearchComboboxOption[] = [
      { id: COMBO_NONE, label: workersDict.teamNone },
    ];
    for (const t of teams) {
      if (deptId != null && t.departmentId !== deptId) continue;
      const dept = departments.find((d) => d.id === t.departmentId);
      opts.push({
        id: String(t.id),
        label: t.name,
        sublabel: dept?.name,
        searchText: `${t.name} ${dept?.name ?? ""}`,
      });
    }
    return opts;
  }, [teams, departments, userForm.departmentId, workersDict.teamNone]);

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

  function openUserAccount(userId?: number) {
    if (userId) {
      const u = users.find((row) => row.id === userId);
      if (!u) return;
      setEditUserId(u.id);
      const membership = u.orgProfile?.teamMemberships[0];
      const team = membership ? teams.find((t) => t.id === membership.teamId) : null;
      setUserForm({
        fullName: u.fullName,
        phone: u.phone || "",
        usernameEmail: u.usernameEmail,
        role: u.role,
        password: "",
        canCreateOwnOrders: u.canCreateOwnOrders ?? true,
        canEditRoute: gpsEnabled ? (u.canEditRoute ?? false) : false,
        canCreateCustomers: u.canCreateCustomers ?? false,
        isDurWorker: durEnabled ? (u.isDurWorker ?? false) : false,
        reportsToId: u.reportsToId != null ? String(u.reportsToId) : COMBO_NONE,
        departmentId: team ? String(team.departmentId) : COMBO_NONE,
        teamId: membership ? String(membership.teamId) : COMBO_NONE,
      });
    } else {
      setEditUserId(null);
      setUserForm(emptyUserForm());
    }
    setShowPassword(false);
    setUserModalOpen(true);
  }

  async function saveUserAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!canMutate) return;
    setIsSubmitting(true);
    try {
      const url = editUserId ? adminApi.user(editUserId) : adminApi.users;
      const method = editUserId ? "PUT" : "POST";
      const payload = {
        ...userForm,
        reportsToId:
          userForm.role === "worker" && userForm.reportsToId !== COMBO_NONE
            ? parseInt(userForm.reportsToId, 10)
            : null,
        teamId:
          userForm.role === "worker" && userForm.teamId !== COMBO_NONE
            ? parseInt(userForm.teamId, 10)
            : null,
        canEditRoute: gpsEnabled ? userForm.canEditRoute : false,
        isDurWorker: durEnabled ? userForm.isDurWorker : false,
      };
      const res = await fetchWithDeviceTelemetry(
        editUserId ? `Admin people: save user ${editUserId}` : "Admin people: create user",
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        { category: "admin" }
      );
      const body = await parseJsonUnknown(res);
      const code = readApiErrorString(body);
      if (res.ok) {
        setUserModalOpen(false);
        await reloadAll();
      } else {
        await appAlert({ message: appDialogApiMessage(apiErrors, code, workersDict.saveError) });
      }
    } catch {
      await appAlert({ message: workersDict.networkError });
    }
    setIsSubmitting(false);
  }

  const treeLabels = {
    searchPlaceholder: dict.treeSearchPlaceholder,
    searchNoResults: dict.treeSearchNoResults,
    emptyTree: dict.noDepartments,
    unassignedTitle: dict.unassignedTitle,
    unassignedEmpty: dict.unassignedEmpty,
    addDepartment: dict.addDepartment,
    addTeam: dict.addTeam,
    addMember: dict.addMember,
    addAccount: workersDict.addUser,
    roleLeader: dict.roleLeader,
    roleMember: dict.roleMember,
    deptBadge: dict.deptBadge,
    teamBadge: dict.teamBadge,
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Users className="h-7 w-7 text-emerald-600" aria-hidden />
          {dict.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dict.subtitle}</p>
      </header>

      <OrgHierarchyTree
        tree={treePayload.tree}
        unassignedUsers={treePayload.unassignedUsers}
        isLoading={isLoading}
        canMutate={canMutate}
        canManageAccounts={canMutate}
        labels={treeLabels}
        onAddDepartment={openCreateDepartment}
        onEditDepartment={openEditDepartment}
        onDeleteDepartment={deleteDepartment}
        onAddTeam={openCreateTeam}
        onEditTeam={openEditTeam}
        onDeleteTeam={deleteTeam}
        onAddMember={openAddMember}
        onDeleteMember={deleteMember}
        onOpenUser={openUserAccount}
        onAddAccount={() => openUserAccount()}
      />

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
            className="space-y-4 p-6"
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.departmentName}</span>
              <input
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder={dict.departmentNamePlaceholder}
                className={INPUT_BASE}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.parentDepartment}</span>
              <select
                value={deptParentId ?? ""}
                onChange={(e) => setDeptParentId(e.target.value ? Number(e.target.value) : null)}
                className={INPUT_BASE}
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
            className="space-y-4 p-6"
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.teamName}</span>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder={dict.teamNamePlaceholder}
                className={INPUT_BASE}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.leader}</span>
              <select
                value={teamLeaderId ?? ""}
                onChange={(e) => setTeamLeaderId(e.target.value ? Number(e.target.value) : null)}
                className={INPUT_BASE}
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
            className="space-y-4 p-6"
          >
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.selectWorker}</span>
              <select
                value={memberUserId ?? ""}
                onChange={(e) => setMemberUserId(e.target.value ? Number(e.target.value) : null)}
                className={INPUT_BASE}
              >
                <option value="">—</option>
                {workerUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{dict.role}</span>
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className={INPUT_BASE}
              >
                <option value="leader">{dict.roleLeader}</option>
                <option value="member">{dict.roleMember}</option>
              </select>
            </label>
          </form>
        </AdminModalShell>
      )}

      {userModalOpen && canMutate && (
        <AdminModalShell
          open
          onClose={() => setUserModalOpen(false)}
          title={editUserId ? workersDict.modalEditTitle : workersDict.modalCreateTitle}
          maxWidthClass="max-w-lg"
          titleSize="lg"
          scrollableBody
          closeOnBackdropClick={false}
          footer={
            <FormModalFooter
              formId="admin-people-user-form"
              onCancel={() => setUserModalOpen(false)}
              submitLabel={editUserId ? workersDict.saveChanges : workersDict.createAccount}
              isSubmitting={isSubmitting}
            />
          }
        >
          <form id="admin-people-user-form" onSubmit={saveUserAccount}>
            <UserFormFields
              form={userForm}
              editId={editUserId}
              showPassword={showPassword}
              onFormChange={setUserForm}
              onTogglePassword={() => setShowPassword((v) => !v)}
              dict={formDict}
              gpsEnabled={gpsEnabled}
              durEnabled={durEnabled}
              supervisorOptions={supervisorOptions}
              departmentOptions={departmentOptions}
              teamOptions={teamOptions}
            />
          </form>
        </AdminModalShell>
      )}
    </div>
  );
}
