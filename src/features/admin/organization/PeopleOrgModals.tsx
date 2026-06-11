"use client";

import type { OrganizationDepartmentRow } from "@/lib/narrow/organization";
import type { AdminUserListRow } from "@/lib/narrow/admin";
import type { PeopleOrgModalsController } from "./usePeopleOrgModals";
import {
  PeopleOrgDeptModal,
  PeopleOrgMemberModal,
  PeopleOrgTeamModal,
} from "./PeopleOrgModalForms";

interface PeopleOrgModalsProps {
  controller: PeopleOrgModalsController;
  departments: OrganizationDepartmentRow[];
  workerUsers: AdminUserListRow[];
  isSubmitting: boolean;
}

export function PeopleOrgModals({
  controller,
  departments,
  workerUsers,
  isSubmitting,
}: PeopleOrgModalsProps) {
  return (
    <>
      <PeopleOrgDeptModal
        controller={controller}
        departments={departments}
        isSubmitting={isSubmitting}
      />
      <PeopleOrgTeamModal
        controller={controller}
        workerUsers={workerUsers}
        isSubmitting={isSubmitting}
      />
      <PeopleOrgMemberModal
        controller={controller}
        workerUsers={workerUsers}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
