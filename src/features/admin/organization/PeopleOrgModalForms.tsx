"use client";

import { useDictionary } from "@/i18n";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { INPUT_BASE } from "@/lib/uiTokens";
import type { OrganizationDepartmentRow } from "@/lib/narrow/organization";
import type { AdminUserListRow } from "@/lib/narrow/admin";
import type { PeopleOrgModalsController } from "./usePeopleOrgModals";

interface PeopleOrgDeptModalProps {
  controller: PeopleOrgModalsController;
  departments: OrganizationDepartmentRow[];
  isSubmitting: boolean;
}

export function PeopleOrgDeptModal({
  controller,
  departments,
  isSubmitting,
}: PeopleOrgDeptModalProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.organization;
  const ui = dictionary.admin.ui;
  const { deptModal, setDeptModal, deptName, setDeptName, deptParentId, setDeptParentId } =
    controller;

  if (!deptModal) return null;

  return (
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
          submitLabel={dictionary.common.categories.shared.save}
          cancelLabel={ui.modalCancel}
        />
      }
    >
      <form
        id="admin-org-dept-form"
        onSubmit={(e) => {
          e.preventDefault();
          void controller.saveDepartment();
        }}
        className="space-y-4 p-6"
      >
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {dict.departmentName}
          </span>
          <input
            value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            placeholder={dict.departmentNamePlaceholder}
            className={INPUT_BASE}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {dict.parentDepartment}
          </span>
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
  );
}

interface PeopleOrgTeamModalProps {
  controller: PeopleOrgModalsController;
  workerUsers: AdminUserListRow[];
  isSubmitting: boolean;
}

export function PeopleOrgTeamModal({
  controller,
  workerUsers,
  isSubmitting,
}: PeopleOrgTeamModalProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.organization;
  const ui = dictionary.admin.ui;
  const { teamModal, setTeamModal, teamName, setTeamName, teamLeaderId, setTeamLeaderId } =
    controller;

  if (!teamModal) return null;

  return (
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
          submitLabel={dictionary.common.categories.shared.save}
          cancelLabel={ui.modalCancel}
        />
      }
    >
      <form
        id="admin-org-team-form"
        onSubmit={(e) => {
          e.preventDefault();
          void controller.saveTeam();
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
  );
}

interface PeopleOrgMemberModalProps {
  controller: PeopleOrgModalsController;
  workerUsers: AdminUserListRow[];
  isSubmitting: boolean;
}

export function PeopleOrgMemberModal({
  controller,
  workerUsers,
  isSubmitting,
}: PeopleOrgMemberModalProps) {
  const dictionary = useDictionary();
  const dict = dictionary.admin.organization;
  const ui = dictionary.admin.ui;
  const {
    memberModalOpen,
    setMemberModalOpen,
    memberUserId,
    setMemberUserId,
    memberRole,
    setMemberRole,
  } = controller;

  if (!memberModalOpen) return null;

  return (
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
          submitLabel={dictionary.common.categories.shared.save}
          cancelLabel={ui.modalCancel}
        />
      }
    >
      <form
        id="admin-org-member-form"
        onSubmit={(e) => {
          e.preventDefault();
          void controller.saveMember();
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
  );
}
