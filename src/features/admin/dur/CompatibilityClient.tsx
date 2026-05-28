"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog } from "@/components/AppDialogProvider";
import { narrowSpareParts, narrowSparePartCategories } from "@/lib/narrow/dur";
import type { SparePart, SparePartCategory } from "@/types/dur";

type CompatibilityRow = {
  partId: number;
  partName: string;
  categoryId: number;
  categoryName: string;
  notes: string | null;
};

export default function CompatibilityClient() {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();

  const dictionary = getDictionary();
  const dict = dictionary.dur.compatibility;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [rows, setRows] = useState<CompatibilityRow[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [machineCategories, setMachineCategories] = useState<SparePartCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formPartId, setFormPartId] = useState<number | null>(null);
  const [formCategoryId, setFormCategoryId] = useState<number | null>(null);
  const [formNotes, setFormNotes] = useState("");

  const fetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    setIsLoading(true);
    try {
      const [partsRes, catRes] = await Promise.all([
        fetch("/api/dur/spare-parts"),
        fetch("/api/dur/spare-part-categories?leavesOnly=1"),
      ]);

      if (id !== fetchRef.current) return;

      const partsData = narrowSpareParts(await partsRes.json());
      const catData = narrowSparePartCategories(await catRes.json());

      setParts(partsData);
      setMachineCategories(catData);

      // Build compatibility rows from parts data
      const compatRows: CompatibilityRow[] = [];
      const catMap = new Map(catData.map((c) => [c.id, c.name]));
      for (const part of partsData) {
        if (part.machineCategoryIds) {
          for (const mcId of part.machineCategoryIds) {
            compatRows.push({
              partId: part.id,
              partName: part.name,
              categoryId: mcId,
              categoryName: catMap.get(mcId) ?? `#${mcId}`,
              notes: null,
            });
          }
        }
      }
      setRows(compatRows);
    } catch {
      console.warn("Failed to load compatibility data.");
    } finally {
      if (id === fetchRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void fetchData());
  }, [fetchData]);

  const openAddModal = useCallback(() => {
    setFormPartId(null);
    setFormCategoryId(null);
    setFormNotes("");
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleAdd = useCallback(async () => {
    if (formPartId == null || formCategoryId == null) {
      await appAlert({ message: "Select both a part and a machine type." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dur/spare-part-compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: formPartId,
          categoryId: formCategoryId,
          notes: formNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        await appAlert({ message: (errData as { error?: string }).error ?? apiErrors.save_error });
        return;
      }

      await appAlert({ message: dict.saveSuccess });
      closeModal();
      await fetchData();
    } catch {
      await appAlert({ message: apiErrors.save_error });
    } finally {
      setIsSubmitting(false);
    }
  }, [formPartId, formCategoryId, formNotes, appAlert, apiErrors, dict, closeModal, fetchData]);

  const handleRemove = useCallback(async (partId: number, categoryId: number) => {
    const confirmed = await appConfirm({ message: dict.removeConfirm, variant: "danger" });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/dur/spare-part-compatibility/${partId}?categoryId=${categoryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        await appAlert({ message: (errData as { error?: string }).error ?? apiErrors.delete_error });
        return;
      }
      await appAlert({ message: dict.removeSuccess });
      await fetchData();
    } catch {
      await appAlert({ message: apiErrors.delete_error });
    }
  }, [appConfirm, appAlert, dict, apiErrors, fetchData]);

  // Available parts and categories for the form (exclude already linked)
  const partsWithoutPart = (partId: number) => parts.filter((p) => p.id !== partId);
  const availableParts = parts;
  const availableCategories = machineCategories;

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Link2 className="h-6 w-6 text-emerald-500" />
          {dict.title}
        </h1>
        {canMutate && (
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {dict.add}
          </button>
        )}
      </div>

      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        {dict.subtitle}
      </p>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 text-sm">
          {dictionary.routeLoading.title}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && rows.length === 0 && (
        <div className="text-center py-12">
          <Link2 className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">{dict.empty}</p>
        </div>
      )}

      {/* Compatibility table */}
      {!isLoading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{dict.table.part}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{dict.table.machineCategory}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{dict.table.notes}</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">{dict.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {rows.map((row, idx) => (
                <tr key={`${row.partId}-${row.categoryId}-${idx}`} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                    {row.partName}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.categoryName}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-500 text-xs italic">
                    {row.notes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canMutate && (
                      <button
                        type="button"
                        onClick={() => handleRemove(row.partId, row.categoryId)}
                        className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                        title={dict.remove}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <AdminModalShell
        open={showModal}
        onClose={closeModal}
        title={dict.add}
        scrollableBody
        footer={
          <FormModalFooter
            onCancel={closeModal}
            submitLabel={dict.add}
            isSubmitting={isSubmitting}
          />
        }
      >
        <div className="space-y-4 p-6">
          {/* Part */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {dict.fields.part} <span className="text-red-500">*</span>
            </label>
            <select
              value={formPartId ?? ""}
              onChange={(e) => setFormPartId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">{dict.fields.partPlaceholder}</option>
              {availableParts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.catalogNumber ? ` (${p.catalogNumber})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Machine category */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {dict.fields.machineCategory} <span className="text-red-500">*</span>
            </label>
            <select
              value={formCategoryId ?? ""}
              onChange={(e) => setFormCategoryId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">{dict.fields.machineCategoryPlaceholder}</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {dict.fields.notes}
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder={dict.fields.notesPlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
      </AdminModalShell>
    </>
  );
}
