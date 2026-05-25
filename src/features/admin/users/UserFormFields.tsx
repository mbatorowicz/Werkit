"use client";

import { Lock, Eye, EyeOff } from "lucide-react";
import { WorkerPermissionToggles } from "@/components/Admin/WorkerPermissionToggles";
import { WORKER_PERMISSION_DEFAULTS } from "@/lib/workerUserPermissions";

export interface UserFormState {
  fullName: string;
  usernameEmail: string;
  password: string;
  role: string;
  canCreateOwnOrders: boolean;
  canEditRoute: boolean;
  canCreateCustomers: boolean;
}

export const emptyUserForm = (): UserFormState => ({
  fullName: "",
  usernameEmail: "",
  password: "",
  role: "worker",
  ...WORKER_PERMISSION_DEFAULTS,
});

interface UserFormFieldsProps {
  form: UserFormState;
  editId: number | null;
  showPassword: boolean;
  onFormChange: (form: UserFormState) => void;
  onTogglePassword: () => void;
  dict: Record<string, string>;
}

export default function UserFormFields({
  form,
  editId,
  showPassword,
  onFormChange,
  onTogglePassword,
  dict,
}: UserFormFieldsProps) {
  const setForm = (next: Partial<UserFormState>) => onFormChange({ ...form, ...next });

  return (
    <form id="admin-user-form" onSubmit={(e) => e.preventDefault()} className="p-6 space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-400">{dict.fullNameLabel}</label>
        <input
          required
          type="text"
          placeholder={dict.fullNamePlaceholder}
          value={form.fullName}
          onChange={(e) => setForm({ fullName: e.target.value })}
          className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-amber-500/80">{dict.roleLabel}</label>
        <select
          value={form.role}
          onChange={(e) => {
            const role = e.target.value;
            setForm({
              role,
              canCreateOwnOrders: role === "worker" ? form.canCreateOwnOrders : false,
              canEditRoute: role === "worker" ? form.canEditRoute : false,
              canCreateCustomers: role === "worker" ? form.canCreateCustomers : false,
            });
          }}
          className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none appearance-none"
        >
          <option value="worker">{dict.roleWorker}</option>
          <option value="admin">{dict.roleAdmin}</option>
          <option value="viewer">{dict.roleViewer}</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">{dict.loginLabel}</label>
          <input
            required
            type="text"
            placeholder={dict.loginPlaceholder}
            value={form.usernameEmail}
            onChange={(e) => setForm({ usernameEmail: e.target.value.toLowerCase() })}
            className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">
            {editId ? dict.passwordLabelEdit : dict.passwordLabelNew}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              required={!editId}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={editId ? dict.passwordPlaceholderEdit : dict.passwordPlaceholderNew}
              value={form.password}
              onChange={(e) => setForm({ password: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] py-2.5 pl-10 pr-11 text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
              aria-label={showPassword ? dict.passwordHide : dict.passwordShow}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {form.role === "worker" ? (
        <WorkerPermissionToggles
          toggles={[
            {
              id: "canCreateOwnOrders",
              checked: form.canCreateOwnOrders,
              onChange: (checked) => setForm({ canCreateOwnOrders: checked }),
              label: dict.canCreateOwnOrdersLabel,
            },
            {
              id: "canEditRoute",
              checked: form.canEditRoute,
              onChange: (checked) => setForm({ canEditRoute: checked }),
              label: dict.canEditRouteLabel,
            },
            {
              id: "canCreateCustomers",
              checked: form.canCreateCustomers,
              onChange: (checked) => setForm({ canCreateCustomers: checked }),
              label: dict.canCreateCustomersLabel,
            },
          ]}
        />
      ) : null}
    </form>
  );
}
