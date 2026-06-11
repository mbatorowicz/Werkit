"use client";

import { useDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import UserFormFields from "@/features/admin/users/UserFormFields";
import type { PeopleUserModalController } from "./usePeopleUserModal";

interface PeopleUserModalProps {
  controller: PeopleUserModalController;
  isSubmitting: boolean;
}

export function PeopleUserModal({ controller, isSubmitting }: PeopleUserModalProps) {
  const { canMutate, gpsEnabled, durEnabled } = useAdminAbility();
  const dictionary = useDictionary();
  const workersDict = dictionary.admin.workers;
  const { org: _org, ...workersFlat } = workersDict;
  const formDict = workersFlat as Record<string, string>;

  const {
    userModalOpen,
    setUserModalOpen,
    editUserId,
    showPassword,
    setShowPassword,
    userForm,
    setUserForm,
    supervisorOptions,
    departmentOptions,
    teamOptions,
    saveUserAccount,
  } = controller;

  if (!userModalOpen || !canMutate) return null;

  return (
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
  );
}
