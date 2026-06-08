"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { useDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog } from "@/components/AppDialogProvider";
import { useResourceGroups, type ResourceGroupOption } from "@/features/admin/dur/useResourceGroups";

export default function DurResourceGroupsClient() {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();

  const dictionary = useDictionary();
  const dict = dictionary.dur.resourceGroups;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const { groups, isLoading, fetchGroups } = useResourceGroups();

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
      await appAlert({ message: dict.nameRequired });
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
    if (!(await appConfirm({ message: dict.deleteConfirm, variant: "danger" }))) {
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
    <>
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Layers className="h-6 w-6 text-emerald-500" />
          {dict.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{dict.subtitle}</p>
        <p className="mt-1 text-xs text-zinc-400">{dict.assignHint}</p>
      </div>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 p-4">
        {canMutate && (
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600"
            >
              <Plus className="h-4 w-4" />
              {dict.add}
            </button>
          </div>
        )}

        {isLoading && <p className="text-sm text-zinc-500">{dict.loading}</p>}

        {!isLoading && groups.length === 0 && (
          <p className="text-sm text-zinc-500 italic">{dict.empty}</p>
        )}

        {!isLoading && groups.length > 0 && (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                    {g.name}
                  </p>
                  {g.description ? (
                    <p className="truncate text-xs text-zinc-500">{g.description}</p>
                  ) : null}
                  <p className="text-[10px] text-zinc-400">
                    {dict.machineCount.replace("{count}", String(g.resourceCount ?? 0))}
                  </p>
                </div>
                {canMutate && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(g)}
                      className="rounded-md p-1.5 text-zinc-500 hover:text-emerald-500"
                      title={dict.edit}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(g)}
                      className="rounded-md p-1.5 text-zinc-500 hover:text-red-500"
                      title={dict.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <AdminModalShell
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? dict.edit : dict.add}
        scrollableBody
        footer={
          <FormModalFooter
            formId="dur-resource-group-form"
            onCancel={() => setShowModal(false)}
            submitLabel={isSubmitting ? dict.saving : dict.save}
            isSubmitting={isSubmitting}
          />
        }
      >
        <form
          id="dur-resource-group-form"
          onSubmit={(e) => void handleSave(e)}
          className="space-y-4 p-6"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">{dict.nameLabel}</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={dict.namePlaceholder}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{dict.descLabel}</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        </form>
      </AdminModalShell>
    </>
  );
}
