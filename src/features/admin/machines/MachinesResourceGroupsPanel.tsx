"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { AppDictionary } from "@/i18n/types";
import type { ResourceGroupOption } from "@/features/admin/dur/useResourceGroups";

type Dict = AppDictionary["admin"]["machines"];

type Props = {
  dict: Dict;
  apiErrors: Record<string, string>;
  groups: ResourceGroupOption[];
  fetchGroups: () => Promise<void>;
  isLoading: boolean;
};

export function MachinesResourceGroupsPanel({
  dict,
  apiErrors,
  groups,
  fetchGroups,
  isLoading,
}: Props) {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    queueMicrotask(() => void fetchGroups());
  }, [fetchGroups]);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setShowModal(true);
  };

  const openEdit = (g: ResourceGroupOption) => {
    setEditingId(g.id);
    setFormName(g.name);
    setFormDescription(g.description ?? "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      await appAlert({ message: dict.resourceGroupNameRequired });
      return;
    }
    setIsSubmitting(true);
    try {
      const url = editingId ? `/api/resource-groups/${editingId}` : "/api/resource-groups";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        await appAlert({ message: apiErrors[err.error ?? ""] ?? dict.apiError });
        return;
      }
      setShowModal(false);
      await fetchGroups();
    } catch {
      await appAlert({ message: dict.apiError });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (g: ResourceGroupOption) => {
    if (!(await appConfirm({ message: dict.resourceGroupDeleteConfirm, variant: "danger" }))) {
      return;
    }
    try {
      const res = await fetch(`/api/resource-groups/${g.id}`, { method: "DELETE" });
      if (!res.ok) {
        await appAlert({ message: dict.apiError });
        return;
      }
      await fetchGroups();
    } catch {
      await appAlert({ message: dict.apiError });
    }
  };

  return (
    <section className="mb-8 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <Layers className="h-5 w-5 text-emerald-500" />
            {dict.resourceGroupsTitle}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">{dict.resourceGroupsSubtitle}</p>
        </div>
        {canMutate && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            {dict.resourceGroupAdd}
          </button>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-zinc-500">{dict.resourceGroupsLoading}</p>
      )}

      {!isLoading && groups.length === 0 && (
        <p className="text-sm text-zinc-500 italic">{dict.resourceGroupsEmpty}</p>
      )}

      {!isLoading && groups.length > 0 && (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
          {groups.map((g) => (
            <li key={g.id} className="flex items-center justify-between py-2.5 gap-2">
              <div className="min-w-0">
                <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                  {g.name}
                </p>
                {g.description ? (
                  <p className="text-xs text-zinc-500 truncate">{g.description}</p>
                ) : null}
                <p className="text-[10px] text-zinc-400">
                  {dict.resourceGroupMachineCount.replace("{count}", String(g.resourceCount ?? 0))}
                </p>
              </div>
              {canMutate && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(g)}
                    className="p-1.5 text-zinc-500 hover:text-emerald-500 rounded-md"
                    title={dict.resourceGroupEdit}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(g)}
                    className="p-1.5 text-zinc-500 hover:text-red-500 rounded-md"
                    title={dict.resourceGroupDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <AdminModalShell
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? dict.resourceGroupEdit : dict.resourceGroupAdd}
        scrollableBody
        footer={
          <FormModalFooter
            formId="resource-group-form"
            onCancel={() => setShowModal(false)}
            submitLabel={isSubmitting ? dict.resourceGroupSaving : dict.resourceGroupSave}
            isSubmitting={isSubmitting}
          />
        }
      >
        <form id="resource-group-form" onSubmit={(e) => void handleSave(e)} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium mb-1">{dict.resourceGroupNameLabel}</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={dict.resourceGroupNamePlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{dict.resourceGroupDescLabel}</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm resize-none"
            />
          </div>
        </form>
      </AdminModalShell>
    </section>
  );
}
