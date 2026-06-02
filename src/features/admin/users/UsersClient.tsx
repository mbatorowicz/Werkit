"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Users } from "lucide-react";
import { getDictionary } from "@/i18n";
import { adminApi } from "@/lib/appRoutes";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { parseJsonUnknown, readApiErrorString } from "@/lib/parseApiJson";
import { narrowAdminUserRows, type AdminUserListRow } from "@/lib/narrowApiListRows";
import { matchesUserSearch } from "@/lib/userSearch";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useAppDialog, appDialogApiMessage } from "@/components/AppDialogProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { FormModalFooter } from "@/components/FormModalFooter";
import UsersTable from "./UsersTable";
import UserFormFields, { emptyUserForm, type UserFormState } from "./UserFormFields";

export default function UsersClient() {
  const { canMutate, gpsEnabled, durEnabled } = useAdminAbility();
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const [users, setUsers] = useState<AdminUserListRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewUser, setPreviewUser] = useState<AdminUserListRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editId, setEditId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyUserForm());
  const dictionary = getDictionary();
  const dict = dictionary.admin.workers;
  const pageTitle = dictionary.admin.sidebar.users;
  const ui = dictionary.admin.ui;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const roleSubtitle = useCallback(
    (role: string) => {
      if (role === "admin") return dict.roleAdminShort;
      if (role === "viewer") return dict.roleViewerShort;
      return dict.roleWorkerShort;
    },
    [dict]
  );

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchWithDeviceTelemetry(
        "Admin users: list",
        adminApi.users,
        { cache: "no-store" },
        {
          category: "admin",
        }
      );
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

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return users;
    return users.filter((user) =>
      matchesUserSearch(
        {
          fullName: user.fullName,
          phone: user.phone,
          usernameEmail: user.usernameEmail,
          role: user.role,
          roleLabel: roleSubtitle(user.role),
        },
        q
      )
    );
  }, [users, searchQuery, roleSubtitle]);

  const handleDelete = async (id: number, name: string) => {
    if (!(await appConfirm({ message: `${dict.confirmDelete} ${name}?`, variant: "danger" })))
      return;
    try {
      const res = await fetchWithDeviceTelemetry(
        `Admin users: delete ${id}`,
        adminApi.user(id),
        { method: "DELETE" },
        {
          category: "admin",
        }
      );
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
      phone: u.phone || "",
      usernameEmail: u.usernameEmail,
      role: u.role,
      password: "",
      canCreateOwnOrders: u.canCreateOwnOrders ?? true,
      canEditRoute: gpsEnabled ? (u.canEditRoute ?? false) : false,
      canCreateCustomers: u.canCreateCustomers ?? false,
      isDurWorker: durEnabled ? (u.isDurWorker ?? false) : false,
    });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditId(null);
    setShowPassword(false);
    setForm(emptyUserForm());
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editId ? adminApi.user(editId) : adminApi.users;
      const method = editId ? "PUT" : "POST";

      const payload: UserFormState = {
        ...form,
        canEditRoute: gpsEnabled ? form.canEditRoute : false,
        isDurWorker: durEnabled ? form.isDurWorker : false,
      };

      const res = await fetchWithDeviceTelemetry(
        editId ? `Admin users: save PUT ${editId}` : "Admin users: save POST",
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

      <UsersTable
        users={users}
        filteredUsers={filteredUsers}
        searchQuery={searchQuery}
        isLoading={isLoading}
        canMutate={canMutate}
        onSearchChange={setSearchQuery}
        onPreview={openPreview}
        onEdit={openEdit}
        onDelete={handleDelete}
        dict={dict}
        roleSubtitle={roleSubtitle}
      />

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
        <form id="admin-user-form" onSubmit={handleSubmit}>
          <UserFormFields
            form={form}
            editId={editId}
            showPassword={showPassword}
            onFormChange={setForm}
            onTogglePassword={() => setShowPassword((v) => !v)}
            dict={dict}
            gpsEnabled={gpsEnabled}
            durEnabled={durEnabled}
          />
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
            {previewUser.phone ? (
              <AdminPreviewField label={dict.phoneLabel} value={previewUser.phone} />
            ) : null}
            <AdminPreviewField label={dict.roleLabel} value={roleSubtitle(previewUser.role)} />
            <AdminPreviewField label={dict.loginLabel} value={previewUser.usernameEmail} />
            {previewUser.role === "worker" ? (
              <>
                <AdminPreviewField
                  label={dict.canCreateOwnOrdersLabel}
                  value={previewUser.canCreateOwnOrders ? dict.previewYes : dict.previewNo}
                />
                {gpsEnabled ? (
                  <AdminPreviewField
                    label={dict.canEditRouteLabel}
                    value={previewUser.canEditRoute ? dict.previewYes : dict.previewNo}
                  />
                ) : null}
                <AdminPreviewField
                  label={dict.canCreateCustomersLabel}
                  value={previewUser.canCreateCustomers ? dict.previewYes : dict.previewNo}
                />
                {durEnabled ? (
                  <AdminPreviewField
                    label={dict.isDurWorkerLabel}
                    value={previewUser.isDurWorker ? dict.previewYes : dict.previewNo}
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </AdminPreviewModal>
    </>
  );
}
