"use client";

import {
  AdminSearchCombobox,
  type AdminSearchComboboxOption,
} from "@/components/Admin/AdminSearchCombobox";
import { WorkerPermissionToggles } from "@/components/Admin/WorkerPermissionToggles";
import { COMBO_NONE, type UserFormState } from "./userFormModel";

interface UserFormWorkerSectionProps {
  form: UserFormState;
  setForm: (next: Partial<UserFormState>) => void;
  dict: Record<string, string>;
  gpsEnabled: boolean;
  durEnabled: boolean;
  supervisorOptions: AdminSearchComboboxOption[];
  departmentOptions: AdminSearchComboboxOption[];
  teamOptions: AdminSearchComboboxOption[];
}

export function UserFormWorkerSection({
  form,
  setForm,
  dict,
  gpsEnabled,
  durEnabled,
  supervisorOptions,
  departmentOptions,
  teamOptions,
}: UserFormWorkerSectionProps) {
  const workerToggles = [
    {
      id: "canCreateOwnOrders",
      checked: form.canCreateOwnOrders,
      onChange: (checked: boolean) => setForm({ canCreateOwnOrders: checked }),
      label: dict.canCreateOwnOrdersLabel,
    },
  ];

  if (gpsEnabled) {
    workerToggles.push({
      id: "canEditRoute",
      checked: form.canEditRoute,
      onChange: (checked: boolean) => setForm({ canEditRoute: checked }),
      label: dict.canEditRouteLabel,
    });
  }

  workerToggles.push({
    id: "canCreateCustomers",
    checked: form.canCreateCustomers,
    onChange: (checked: boolean) => setForm({ canCreateCustomers: checked }),
    label: dict.canCreateCustomersLabel,
  });

  if (durEnabled) {
    workerToggles.push({
      id: "isDurWorker",
      checked: form.isDurWorker,
      onChange: (checked: boolean) => setForm({ isDurWorker: checked }),
      label: dict.isDurWorkerLabel,
    });
  }

  return (
    <>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {dict.teamDepartmentLabel}
        </label>
        <AdminSearchCombobox
          options={departmentOptions}
          value={form.departmentId}
          noneId={COMBO_NONE}
          onChange={(id) =>
            setForm({
              departmentId: id,
              teamId: COMBO_NONE,
            })
          }
          placeholder={dict.teamDepartmentPlaceholder}
          aria-label={dict.teamDepartmentLabel}
          clearAriaLabel={dict.teamDepartmentClear}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {dict.teamLabel}
        </label>
        <AdminSearchCombobox
          options={teamOptions}
          value={form.teamId}
          noneId={COMBO_NONE}
          onChange={(id) => setForm({ teamId: id })}
          placeholder={dict.teamPlaceholder}
          aria-label={dict.teamLabel}
          clearAriaLabel={dict.teamClear}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {dict.supervisorLabel}
        </label>
        <AdminSearchCombobox
          options={supervisorOptions}
          value={form.reportsToId}
          noneId={COMBO_NONE}
          onChange={(id) => setForm({ reportsToId: id })}
          placeholder={dict.supervisorPlaceholder}
          aria-label={dict.supervisorLabel}
          clearAriaLabel={dict.supervisorClear}
        />
      </div>
      <WorkerPermissionToggles toggles={workerToggles} />
    </>
  );
}
