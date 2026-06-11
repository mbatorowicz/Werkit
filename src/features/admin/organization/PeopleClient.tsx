"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { useDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { OrgHierarchyTree } from "./OrgHierarchyTree";
import { usePeopleData } from "./usePeopleData";
import { usePeopleOrgModals } from "./usePeopleOrgModals";
import { usePeopleUserModal } from "./usePeopleUserModal";
import { PeopleOrgModals } from "./PeopleOrgModals";
import { PeopleUserModal } from "./PeopleUserModal";

export default function PeopleClient() {
  const { canMutate } = useAdminAbility();
  const dictionary = useDictionary();
  const dict = dictionary.admin.organization;
  const workersDict = dictionary.admin.workers;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { treePayload, departments, teams, users, workerUsers, isLoading, reloadAll } =
    usePeopleData();

  const orgModals = usePeopleOrgModals({ reloadAll, setIsSubmitting });

  const userModal = usePeopleUserModal({
    users,
    teams,
    departments,
    reloadAll,
    setIsSubmitting,
  });

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
        onAddDepartment={orgModals.openCreateDepartment}
        onEditDepartment={orgModals.openEditDepartment}
        onDeleteDepartment={orgModals.deleteDepartment}
        onAddTeam={orgModals.openCreateTeam}
        onEditTeam={orgModals.openEditTeam}
        onDeleteTeam={orgModals.deleteTeam}
        onAddMember={orgModals.openAddMember}
        onDeleteMember={orgModals.deleteMember}
        onOpenUser={userModal.openUserAccount}
        onAddAccount={() => userModal.openUserAccount()}
      />

      <PeopleOrgModals
        controller={orgModals}
        departments={departments}
        workerUsers={workerUsers}
        isSubmitting={isSubmitting}
      />

      <PeopleUserModal controller={userModal} isSubmitting={isSubmitting} />
    </div>
  );
}
