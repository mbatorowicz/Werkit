"use client";

import { Lock, Eye, EyeOff } from "lucide-react";
import { WorkerPermissionToggles } from "@/components/Admin/WorkerPermissionToggles";
import { WORKER_PERMISSION_DEFAULTS } from "@/lib/workerUserPermissions";

export interface UserFormState {
  fullName: string;
  phone: string;
  usernameEmail: string;
  password: string;
  role: string;
  canCreateOwnOrders: boolean;
  canEditRoute: boolean;
  canCreateCustomers: boolean;
  isDurWorker: boolean;
}

export const emptyUserForm = (): UserFormState => ({
  fullName: "",
  phone: "",
  usernameEmail: "",
  password: "",
  role: "worker",
  ...WORKER_PERMISSION_DEFAULTS,
});

const INPUT =
  "w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";

interface UserFormFieldsProps {
  form: UserFormState;
  editId: number | null;
  showPassword: boolean;
  onFormChange: (form: UserFormState) => void;
  onTogglePassword: () => void;
  dict: Record<string, string>;
  /** Gdy false — ukryj checkbox pracownika serwisowego (moduł DUR wyłączony). */
  durEnabled?: boolean;
}

export default function UserFormFields({
  form,
  editId,
  showPassword,
  onFormChange,
  onTogglePassword,
  dict,
  durEnabled = false,
}: UserFormFieldsProps) {
  const setForm = (next: Partial<UserFormState>) => onFormChange({ ...form, ...next });

  const workerToggles = [
    {
      id: "canCreateOwnOrders",
      checked: form.canCreateOwnOrders,
      onChange: (checked: boolean) => setForm({ canCreateOwnOrders: checked }),
      label: dict.canCreateOwnOrdersLabel,
    },
    {
      id: "canEditRoute",
      checked: form.canEditRoute,
      onChange: (checked: boolean) => setForm({ canEditRoute: checked }),
      label: dict.canEditRouteLabel,
    },
    {
      id: "canCreateCustomers",
      checked: form.canCreateCustomers,
      onChange: (checked: boolean) => setForm({ canCreateCustomers: checked }),
      label: dict.canCreateCustomersLabel,
    },
  ];

  if (durEnabled) {
    workerToggles.push({
      id: "isDurWorker",
      checked: form.isDurWorker,
      onChange: (checked: boolean) => setForm({ isDurWorker: checked }),
      label: dict.isDurWorkerLabel,
    });
  }

  return (
    <div className="space-y-5 p-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {dict.fullNameLabel}
        </label>
        <input
          required
          type="text"
          placeholder={dict.fullNamePlaceholder}
          value={form.fullName}
          onChange={(e) => setForm({ fullName: e.target.value })}
          className={INPUT}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {dict.phoneLabel}
        </label>
        <input
          type="tel"
          placeholder={dict.phonePlaceholder}
          value={form.phone}
          onChange={(e) => setForm({ phone: e.target.value })}
          className={INPUT}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {dict.roleLabel}
        </label>
        <select
          value={form.role}
          onChange={(e) => {
            const role = e.target.value;
            setForm({
              role,
              canCreateOwnOrders: role === "worker" ? form.canCreateOwnOrders : false,
              canEditRoute: role === "worker" ? form.canEditRoute : false,
              canCreateCustomers: role === "worker" ? form.canCreateCustomers : false,
              isDurWorker: role === "worker" ? form.isDurWorker : false,
            });
          }}
          className={`${INPUT} py-3 appearance-none`}
        >
          <option value="worker">{dict.roleWorker}</option>
          <option value="admin">{dict.roleAdmin}</option>
          <option value="viewer">{dict.roleViewer}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {dict.loginLabel}
          </label>
          <input
            required
            type="text"
            placeholder={dict.loginPlaceholder}
            value={form.usernameEmail}
            onChange={(e) => setForm({ usernameEmail: e.target.value.toLowerCase() })}
            className={INPUT}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {editId ? dict.passwordLabelEdit : dict.passwordLabelNew}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              required={!editId}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder={editId ? dict.passwordPlaceholderEdit : dict.passwordPlaceholderNew}
              value={form.password}
              onChange={(e) => setForm({ password: e.target.value })}
              className={`${INPUT} py-2.5 pl-10 pr-11`}
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

      {form.role === "worker" ? <WorkerPermissionToggles toggles={workerToggles} /> : null}
    </div>
  );
}
