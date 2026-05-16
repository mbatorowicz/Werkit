"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Shield, Plus, Lock, Edit2, Loader2, Users, Eye, EyeOff } from "lucide-react";
import { getDictionary } from "@/i18n";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { narrowAdminUserRows, type AdminUserListRow } from "@/lib/narrowApiListRows";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { FormModalFooter } from "@/components/FormModalFooter";
import { stopRowActionClick } from "@/lib/stopRowActionClick";

export default function UsersClient() {
  const { canMutate } = useAdminAbility();
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const [users, setUsers] = useState<AdminUserListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUser, setPreviewUser] = useState<AdminUserListRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    usernameEmail: "",
    password: "",
    role: "worker",
    canCreateOwnOrders: true,
    canEditRoute: false,
  });
  const dictionary = getDictionary();
  const dict = dictionary.admin.workers;
  const pageTitle = dictionary.admin.sidebar.users;
  const ui = dictionary.admin.ui;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const roleSubtitle = (role: string) => {
    if (role === "admin") return dict.roleAdminShort;
    if (role === "viewer") return dict.roleViewerShort;
    return dict.roleWorkerShort;
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry("Admin users: list", "/api/workers", { cache: "no-store" }, {
        category: "admin",
      });
      const data = await parseJsonArray(res);
      setUsers(narrowAdminUserRows(data));
    } catch {
      /* sieć */
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchUsers();
    });
  }, [fetchUsers]);

  const handleDelete = async (id: number, name: string) => {
    if (!(await appConfirm({ message: `${dict.confirmDelete} ${name}?`, variant: "danger" }))) return;
    try {
      const res = await fetchWithDeviceTelemetry(`Admin users: delete ${id}`, `/api/workers/${id}`, { method: "DELETE" }, {
        category: "admin",
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const body = await parseJsonUnknown(res);
        const code = readApiErrorString(body);
        await appAlert({ message: appDialogApiMessage(apiErrors, code, dict.deleteError) });
      }
    } catch {
      await appAlert({ message: dict.networkError });
    }
  };

  const openPreview = (u: AdminUserListRow) => {
    setPreviewUser(u);
  };

  const openEdit = (u: AdminUserListRow) => {
    setPreviewUser(null);
    setEditId(u.id);
    setShowPassword(false);
    setForm({
      fullName: u.fullName,
      usernameEmail: u.usernameEmail,
      role: u.role,
      password: "",
      canCreateOwnOrders: u.canCreateOwnOrders ?? true,
      canEditRoute: u.canEditRoute ?? false,
    });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditId(null);
    setShowPassword(false);
    setForm({ fullName: "", usernameEmail: "", password: "", role: "worker", canCreateOwnOrders: true, canEditRoute: false });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editId ? `/api/workers/${editId}` : "/api/workers";
      const method = editId ? "PUT" : "POST";

      const res = await fetchWithDeviceTelemetry(
        editId ? `Admin users: save PUT ${editId}` : "Admin users: save POST",
        url,
        {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
        { category: "admin" },
      );

      const body = await parseJsonUnknown(res);
      const code = readApiErrorString(body);
      if (res.ok) {
        setIsModalOpen(false);
        fetchUsers();
      } else {
        await appAlert({ message: appDialogApiMessage(apiErrors, code, dict.saveError) });
      }
    } catch {
      await appAlert({ message: dict.networkError });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 pt-2">
            <Users className="w-6 h-6 text-emerald-500" /> {pageTitle}
          </h2>
        </div>
        {canMutate && (
          <button
            type="button"
            onClick={openNewModal}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-2.5 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-white transition shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {dict.addUser}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700/50 bg-zinc-50 dark:bg-[#0a0a0b]/80">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.nameRole}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{dict.systemLogin}</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">{dict.management}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    {dict.fetching}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => openPreview(user)}
                    className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/20"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 flex items-center justify-center text-emerald-700 dark:text-zinc-300 font-bold">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
                            {user.fullName}
                            {user.role === "admin" && <Shield className="w-3.5 h-3.5 text-amber-500" />}
                            {user.role === "viewer" && <Eye className="w-3.5 h-3.5 text-sky-500" />}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{roleSubtitle(user.role)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded text-sm font-mono tracking-wide">
                        {user.usernameEmail}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canMutate && (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              stopRowActionClick(e);
                              openEdit(user);
                            }}
                            className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition"
                            title={dict.editTitle}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {user.role !== "admin" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                stopRowActionClick(e);
                                void handleDelete(user.id, user.fullName);
                              }}
                              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
                              title={dict.deleteTitle}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                    {dict.noUsers}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminModalShell
        open={isModalOpen && canMutate}
        onClose={() => setIsModalOpen(false)}
        title={editId ? dict.modalEditTitle : dict.modalCreateTitle}
        maxWidthClass="max-w-lg"
        titleSize="lg"
        scrollableBody
        closeOnBackdropClick={false}
        footer={
          <FormModalFooter
            formId="admin-user-form"
            onCancel={() => setIsModalOpen(false)}
            submitLabel={editId ? dict.saveChanges : dict.createAccount}
            isSubmitting={isSubmitting}
            submitClassName="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold hover:bg-zinc-800 dark:hover:bg-white transition disabled:opacity-50 flex items-center justify-center min-w-[7rem]"
          />
        }
      >
            <form id="admin-user-form" onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">{dict.fullNameLabel}</label>
                <input
                  required
                  type="text"
                  placeholder={dict.fullNamePlaceholder}
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-500/80">{dict.roleLabel}</label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value,
                      canCreateOwnOrders: e.target.value === "worker" ? form.canCreateOwnOrders : false,
                      canEditRoute: e.target.value === "worker" ? form.canEditRoute : false,
                    })
                  }
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
                    onChange={(e) => setForm({ ...form, usernameEmail: e.target.value.toLowerCase() })}
                    className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-400">{editId ? dict.passwordLabelEdit : dict.passwordLabelNew}</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                    <input
                      required={!editId}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder={editId ? dict.passwordPlaceholderEdit : dict.passwordPlaceholderNew}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] py-2.5 pl-10 pr-11 text-zinc-900 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                      aria-label={showPassword ? dict.passwordHide : dict.passwordShow}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {form.role === "worker" && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <label className="relative flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.canCreateOwnOrders}
                        onChange={(e) => setForm({ ...form, canCreateOwnOrders: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                    </label>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{dict.canCreateOwnOrdersLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={form.canEditRoute}
                        onChange={(e) => setForm({ ...form, canEditRoute: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 dark:after:border-zinc-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                    </label>
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{dict.canEditRouteLabel}</span>
                  </div>
                </div>
              )}

            </form>
      </AdminModalShell>

      <AdminPreviewModal
        open={previewUser != null}
        onClose={() => setPreviewUser(null)}
        title={ui.previewTitle}
        canEdit={canMutate}
        onEdit={previewUser ? () => openEdit(previewUser) : undefined}
        editLabel={dict.editTitle}
      >
        {previewUser ? (
          <>
            <AdminPreviewField label={dict.fullNameLabel} value={previewUser.fullName} />
            <AdminPreviewField label={dict.roleLabel} value={roleSubtitle(previewUser.role)} />
            <AdminPreviewField label={dict.loginLabel} value={previewUser.usernameEmail} />
            {previewUser.role === "worker" ? (
              <>
                <AdminPreviewField
                  label={dict.canCreateOwnOrdersLabel}
                  value={previewUser.canCreateOwnOrders ? dict.previewYes : dict.previewNo}
                />
                <AdminPreviewField
                  label={dict.canEditRouteLabel}
                  value={previewUser.canEditRoute ? dict.previewYes : dict.previewNo}
                />
              </>
            ) : null}
          </>
        ) : null}
      </AdminPreviewModal>
    </>
  );
}
