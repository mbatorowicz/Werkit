"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { CompanyUsageRow } from "@/services/PlatformAnalyticsService";
import type { PlatformTenantUserRow } from "@/services/PlatformTenantUserService";
import type { AppDictionary } from "@/i18n/types";
import { useDictionary, formatDict, formatUiDateTimeShort } from "@/i18n";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { cn } from "@/lib/cn";
import { INPUT_BASE } from "@/lib/uiTokens";
import { FIELD_HINT } from "@/lib/uiTypography";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";
import { BTN_DANGER_SOFT, BTN_PRIMARY_COMPACT_SM, BTN_SECONDARY_SM } from "@/lib/uiButtons";
import {
  TABLE_ACTIONS,
  TABLE_BASE,
  TABLE_BODY_ROW,
  TABLE_EMPTY_CELL,
  TABLE_HEAD,
  TABLE_HEAD_ROW,
  TABLE_TD,
  TABLE_TD_MUTED,
  TABLE_TD_STRONG,
  TABLE_TH,
  TABLE_WRAPPER,
} from "@/lib/uiTable";
import { narrowPlatformTenantUsers } from "@/lib/narrow/platform";
import { ImpersonateUserActions } from "@/components/Platform/ImpersonateUserActions";

type Dict = AppDictionary["platform"];

type Props = {
  row: CompanyUsageRow;
  dict: Dict;
  onChanged: () => Promise<void>;
};

export function CompanyAdminsTab({ row, dict, onChanged }: Props) {
  const apiErrors = useDictionary().apiErrors as Record<string, string>;
  const { confirm: appConfirm } = useAppDialog();
  const [users, setUsers] = useState<PlatformTenantUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch(`/api/platform/companies/${row.companyId}/users`, {
        credentials: "include",
      });
      const body = (await res.json().catch(() => ({}))) as { users?: unknown; error?: string };
      if (!res.ok) {
        setUsers([]);
        setListError(apiErrors[body.error ?? ""] ?? dict.usersLoadError);
        return;
      }
      setUsers(narrowPlatformTenantUsers(body.users));
    } catch {
      setUsers([]);
      setListError(dict.usersLoadError);
    } finally {
      setLoading(false);
    }
  }, [apiErrors, dict.usersLoadError, row.companyId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {formatDict(dict.accountsInOrg, { count: row.userCount })}
      </p>
      {listError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {listError}
        </p>
      )}
      <AdminsTable
        companyId={row.companyId}
        companyActive={row.isActive}
        users={users}
        loading={loading}
        dict={dict}
        apiErrors={apiErrors}
        appConfirm={appConfirm}
        onStatusMessage={(text, error) => {
          setMsg(text);
          setIsError(error);
        }}
        onReload={loadUsers}
        onChanged={onChanged}
      />
      <AddAdminForm
        companyId={row.companyId}
        dict={dict}
        apiErrors={apiErrors}
        msg={msg}
        isError={isError}
        disabled={!row.isActive}
        onStatusMessage={(text, error) => {
          setMsg(text);
          setIsError(error);
        }}
        onCreated={async () => {
          await loadUsers();
          await onChanged();
        }}
      />
    </div>
  );
}

function AdminsTable({
  companyId,
  companyActive,
  users,
  loading,
  dict,
  apiErrors,
  appConfirm,
  onStatusMessage,
  onReload,
  onChanged,
}: {
  companyId: number;
  companyActive: boolean;
  users: PlatformTenantUserRow[];
  loading: boolean;
  dict: Dict;
  apiErrors: Record<string, string>;
  appConfirm: (opts: { message: string; variant?: "default" | "danger" }) => Promise<boolean>;
  onStatusMessage: (text: string, error: boolean) => void;
  onReload: () => Promise<void>;
  onChanged: () => Promise<void>;
}) {
  const [statusPendingId, setStatusPendingId] = useState<number | null>(null);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetPending, setResetPending] = useState(false);

  async function toggleActive(user: PlatformTenantUserRow) {
    const next = !user.isActive;
    const confirmed = await appConfirm({
      message: formatDict(next ? dict.activateUserConfirm : dict.deactivateUserConfirm, {
        name: user.fullName,
        login: user.usernameEmail,
      }),
      variant: next ? "default" : "danger",
    });
    if (!confirmed) return;

    setStatusPendingId(user.id);
    try {
      const res = await fetch(`/api/platform/companies/${companyId}/users/${user.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onStatusMessage(appDialogApiMessage(apiErrors, body.error, dict.userStatusError), true);
        return;
      }
      onStatusMessage(dict.updateSuccess, false);
      await onReload();
      await onChanged();
    } finally {
      setStatusPendingId(null);
    }
  }

  async function submitReset(e: React.FormEvent, user: PlatformTenantUserRow) {
    e.preventDefault();
    const confirmed = await appConfirm({
      message: formatDict(dict.resetPasswordConfirm, { name: user.fullName }),
      variant: "danger",
    });
    if (!confirmed) return;

    setResetPending(true);
    try {
      const res = await fetch(`/api/platform/companies/${companyId}/users/${user.id}/password`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onStatusMessage(appDialogApiMessage(apiErrors, body.error, dict.resetPasswordError), true);
        return;
      }
      onStatusMessage(dict.resetPasswordSuccess, false);
      setResetPassword("");
      setResetUserId(null);
    } finally {
      setResetPending(false);
    }
  }

  return (
    <div className={TABLE_WRAPPER}>
      <table className={TABLE_BASE}>
        <thead className={TABLE_HEAD}>
          <tr className={TABLE_HEAD_ROW}>
            <th className={TABLE_TH}>{dict.adminName}</th>
            <th className={TABLE_TH}>{dict.adminEmail}</th>
            <th className={TABLE_TH}>{dict.colRole}</th>
            <th className={TABLE_TH}>{dict.colStatus}</th>
            <th className={TABLE_TH}>{dict.colLastLogin}</th>
            <th className={TABLE_TH}>{dict.colActions}</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className={TABLE_EMPTY_CELL} colSpan={6}>
                <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td className={TABLE_EMPTY_CELL} colSpan={6}>
                {dict.noAdminYet}
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr key={user.id} className={TABLE_BODY_ROW}>
                <td className={TABLE_TD_STRONG}>{user.fullName}</td>
                <td className={TABLE_TD}>{user.usernameEmail}</td>
                <td className={TABLE_TD}>
                  {user.role === "admin" ? dict.roleAdmin : dict.roleViewer}
                </td>
                <td className={TABLE_TD}>{user.isActive ? dict.userActive : dict.userInactive}</td>
                <td className={TABLE_TD_MUTED}>
                  {user.lastLoginAt ? formatUiDateTimeShort(user.lastLoginAt) : dict.lastLoginNever}
                </td>
                <td className={TABLE_TD}>
                  <div className={cn(TABLE_ACTIONS, "flex-col items-end gap-2")}>
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        disabled={statusPendingId === user.id}
                        onClick={() => void toggleActive(user)}
                        className={user.isActive ? BTN_DANGER_SOFT : BTN_SECONDARY_SM}
                      >
                        {statusPendingId === user.id && (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                        )}
                        {user.isActive ? dict.deactivateUser : dict.activateUser}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResetUserId((current) => (current === user.id ? null : user.id));
                          setResetPassword("");
                        }}
                        className={BTN_SECONDARY_SM}
                      >
                        {dict.resetPassword}
                      </button>
                    </div>
                    {resetUserId === user.id && (
                      <ResetPasswordForm
                        dict={dict}
                        password={resetPassword}
                        pending={resetPending}
                        onPasswordChange={setResetPassword}
                        onSubmit={(e) => void submitReset(e, user)}
                      />
                    )}
                    <ImpersonateUserActions
                      companyId={companyId}
                      companyActive={companyActive}
                      user={user}
                      dict={dict}
                      apiErrors={apiErrors}
                      onStatusMessage={onStatusMessage}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ResetPasswordForm({
  dict,
  password,
  pending,
  onPasswordChange,
  onSubmit,
}: {
  dict: Dict;
  password: string;
  pending: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex w-full min-w-[12rem] flex-col gap-2">
      <label className="block text-xs">
        <span className="text-zinc-500 dark:text-zinc-400">{dict.resetPasswordNew}</span>
        <input
          required
          type="password"
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          className={cn(INPUT_BASE, "mt-1")}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" disabled={pending} className={BTN_PRIMARY_COMPACT_SM}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
        {dict.resetPassword}
      </button>
    </form>
  );
}

function AddAdminForm({
  companyId,
  dict,
  apiErrors,
  msg,
  isError,
  disabled = false,
  onStatusMessage,
  onCreated,
}: {
  companyId: number;
  dict: Dict;
  apiErrors: Record<string, string>;
  msg: string | null;
  isError: boolean;
  disabled?: boolean;
  onStatusMessage: (text: string, error: boolean) => void;
  onCreated: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  if (disabled) {
    return (
      <p className={cn(FIELD_HINT, "border-t border-zinc-100 pt-4 dark:border-zinc-800")}>
        {dict.addAdminInactiveHint}
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch(`/api/platform/companies/${companyId}/admin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, usernameEmail: email, password }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        onStatusMessage(apiErrors[body.error ?? ""] ?? dict.createError, true);
        return;
      }
      onStatusMessage(dict.addAdminSuccess, false);
      setFullName("");
      setEmail("");
      setPassword("");
      await onCreated();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 border-t border-zinc-100 pt-4 dark:border-zinc-800"
    >
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{dict.addAdminHeading}</p>
      <label className="block text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{dict.adminName}</span>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={cn(INPUT_BASE, "mt-1.5")}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{dict.adminEmail}</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(INPUT_BASE, "mt-1.5")}
        />
      </label>
      <label className="block text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{dict.adminPassword}</span>
        <input
          required
          type="password"
          minLength={PASSWORD_MIN_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn(INPUT_BASE, "mt-1.5")}
        />
      </label>
      <p className={FIELD_HINT}>{dict.adminPasswordHint}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={BTN_PRIMARY_COMPACT_SM}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {dict.addAdmin}
        </button>
        {msg && (
          <p
            role="status"
            className={`text-sm ${isError ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
          >
            {msg}
          </p>
        )}
      </div>
    </form>
  );
}
