"use client";

import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { useDictionary } from "@/i18n";
import { adminApi } from "@/lib/appRoutes";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import type { OrganizationDepartmentRow, OrganizationTeamRow } from "@/lib/narrow/organization";
import type { AdminUserListRow } from "@/lib/narrow/admin";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import {
  COMBO_NONE,
  emptyUserForm,
  type UserFormState,
} from "@/features/admin/users/UserFormFields";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";

interface UsePeopleUserModalArgs {
  users: AdminUserListRow[];
  teams: OrganizationTeamRow[];
  departments: OrganizationDepartmentRow[];
  reloadAll: () => Promise<void>;
  setIsSubmitting: (value: boolean) => void;
}

function userFormFromRow(
  u: AdminUserListRow,
  teams: OrganizationTeamRow[],
  gpsEnabled: boolean,
  durEnabled: boolean
): UserFormState {
  const membership = u.orgProfile?.teamMemberships[0];
  const team = membership ? teams.find((t) => t.id === membership.teamId) : null;
  return {
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
  };
}

export interface PeopleUserModalController {
  userModalOpen: boolean;
  setUserModalOpen: (open: boolean) => void;
  editUserId: number | null;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  userForm: UserFormState;
  setUserForm: Dispatch<SetStateAction<UserFormState>>;
  supervisorOptions: AdminSearchComboboxOption[];
  departmentOptions: AdminSearchComboboxOption[];
  teamOptions: AdminSearchComboboxOption[];
  openUserAccount: (userId?: number) => void;
  saveUserAccount: (e: FormEvent) => Promise<void>;
}

export function usePeopleUserModal({
  users,
  teams,
  departments,
  reloadAll,
  setIsSubmitting,
}: UsePeopleUserModalArgs): PeopleUserModalController {
  const { canMutate, gpsEnabled, durEnabled } = useAdminAbility();
  const { alert: appAlert } = useAppDialog();
  const dictionary = useDictionary();
  const workersDict = dictionary.admin.workers;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState<UserFormState>(emptyUserForm());

  const roleSubtitle = useCallback(
    (role: string) => {
      if (role === "admin") return workersDict.roleAdminShort;
      if (role === "viewer") return workersDict.roleViewerShort;
      return workersDict.roleWorkerShort;
    },
    [workersDict]
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
    const opts: AdminSearchComboboxOption[] = [{ id: COMBO_NONE, label: workersDict.teamNone }];
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

  function openUserAccount(userId?: number) {
    if (userId) {
      const u = users.find((row) => row.id === userId);
      if (!u) return;
      setEditUserId(u.id);
      setUserForm(userFormFromRow(u, teams, gpsEnabled, durEnabled));
    } else {
      setEditUserId(null);
      setUserForm(emptyUserForm());
    }
    setShowPassword(false);
    setUserModalOpen(true);
  }

  async function saveUserAccount(e: FormEvent) {
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

  return {
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
    openUserAccount,
    saveUserAccount,
  };
}
