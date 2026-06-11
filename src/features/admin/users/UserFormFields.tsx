"use client";

import { Lock, Eye, EyeOff } from "lucide-react";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { UserFormWorkerSection } from "./UserFormWorkerSection";
import { COMBO_NONE, type UserFormState } from "./userFormModel";

export { COMBO_NONE, emptyUserForm } from "./userFormModel";
export type { UserFormState } from "./userFormModel";

const INPUT =
  "w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white";

interface UserFormFieldsProps {
  form: UserFormState;
  editId: number | null;
  showPassword: boolean;
  onFormChange: (form: UserFormState) => void;
  onTogglePassword: () => void;
  dict: Record<string, string>;
  /** Gdy false — ukryj opcje związane z mapą (np. edycja trasy). */
  gpsEnabled?: boolean;
  /** Gdy false — ukryj checkbox pracownika serwisowego (moduł DUR wyłączony). */
  durEnabled?: boolean;
  supervisorOptions?: AdminSearchComboboxOption[];
  departmentOptions?: AdminSearchComboboxOption[];
  teamOptions?: AdminSearchComboboxOption[];
}

export default function UserFormFields({
  form,
  editId,
  showPassword,
  onFormChange,
  onTogglePassword,
  dict,
  gpsEnabled = true,
  durEnabled = false,
  supervisorOptions = [],
  departmentOptions = [],
  teamOptions = [],
}: UserFormFieldsProps) {
  const setForm = (next: Partial<UserFormState>) => onFormChange({ ...form, ...next });

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
              canEditRoute: role === "worker" && gpsEnabled ? form.canEditRoute : false,
              canCreateCustomers: role === "worker" ? form.canCreateCustomers : false,
              isDurWorker: role === "worker" && durEnabled ? form.isDurWorker : false,
              reportsToId: role === "worker" ? form.reportsToId : COMBO_NONE,
              departmentId: role === "worker" ? form.departmentId : COMBO_NONE,
              teamId: role === "worker" ? form.teamId : COMBO_NONE,
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

      {form.role === "worker" ? (
        <UserFormWorkerSection
          form={form}
          setForm={setForm}
          dict={dict}
          gpsEnabled={gpsEnabled}
          durEnabled={durEnabled}
          supervisorOptions={supervisorOptions}
          departmentOptions={departmentOptions}
          teamOptions={teamOptions}
        />
      ) : null}
    </div>
  );
}
