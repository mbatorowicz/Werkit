"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Cog, Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import {
  useSparePartsAdminData,
  type SparePartsAdminAlertContext,
} from "@/features/admin/dur/useSparePartsAdminData";
import { useResourceGroups } from "@/features/admin/dur/useResourceGroups";
import { useSparePartForm } from "@/features/admin/dur/useSparePartForm";
import { SparePartFormModal } from "@/features/admin/dur/SparePartFormModal";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { SparePart } from "@/types/dur";

export default function SparePartsClient() {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();

  const dictionary = getDictionary();
  const dict = dictionary.dur.spareParts;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const durApiErrors = dictionary.dur.apiErrors as Record<string, string>;

  const alertCtxRef = useRef<SparePartsAdminAlertContext>({
    apiErrors,
    listFetchFallback: "Failed to load spare parts.",
  });

  const { parts, categories, isLoading, fetchData } = useSparePartsAdminData(alertCtxRef);
  const { groups: machineGroups, fetchGroups } = useResourceGroups();


  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    alertCtxRef.current = { apiErrors, listFetchFallback: "Failed to load spare parts." };
  }, [apiErrors]);

  useEffect(() => {
    queueMicrotask(() => void fetchData());
    queueMicrotask(() => void fetchGroups());
  }, [fetchData, fetchGroups]);

  const handleSaveSuccess = useCallback(async () => {
    await appAlert({ message: dict.saveSuccess });
    setShowModal(false);
    await fetchData();
  }, [appAlert, dict.saveSuccess, fetchData]);

  const handleSaveError = useCallback(
    (message: string) => {
      void appAlert({ message });
    },
    [appAlert]
  );

  const {
    formState,
    setFormState,
    editingPart,
    isSubmitting,
    openCreate,
    openEdit,
    save,
  } = useSparePartForm({
    onSuccess: handleSaveSuccess,
    onError: handleSaveError,
    dict: { saveSuccess: dict.saveSuccess, apiErrors: durApiErrors },
  });

  const handleOpenCreate = useCallback(() => {
    openCreate();
    setShowModal(true);
  }, [openCreate]);

  const handleOpenEdit = useCallback(
    (part: SparePart) => {
      openEdit(part);
      setShowModal(true);
    },
    [openEdit]
  );

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleDelete = useCallback(
    async (part: SparePart) => {
      const confirmed = await appConfirm({ message: dict.deleteConfirm, variant: "danger" });
      if (!confirmed) return;
      try {
        const res = await fetch(`/api/dur/spare-parts/${part.id}`, { method: "DELETE" });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          await appAlert({
            message: (errData as { error?: string }).error ?? apiErrors.delete_error,
          });
          return;
        }
        await appAlert({ message: dict.deleteSuccess });
        await fetchData();
      } catch {
        await appAlert({ message: apiErrors.delete_error });
      }
    },
    [appConfirm, appAlert, dict, apiErrors, fetchData]
  );

  const filteredParts = parts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.catalogNumber ?? "").toLowerCase().includes(q) ||
      (p.manufacturer ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Cog className="h-6 w-6 text-emerald-500" />
          {dict.title}
        </h1>
        {canMutate && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {dict.newPart}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={dict.searchPlaceholder}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 text-sm">
          {dict.fetching}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredParts.length === 0 && (
        <div className="text-center py-12">
          <Cog className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            {searchQuery ? dict.emptySearch : dict.empty}
          </p>
        </div>
      )}

      {/* Parts table */}
      {!isLoading && filteredParts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.name}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.catalogNumber}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.manufacturer}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.unit}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.price}
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.location}
                </th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">
                  {dict.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {filteredParts.map((part) => (
                <tr
                  key={part.id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      {part.name}
                      {part.minStock != null && Number(part.minStock) > 0 && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded-full"
                          title={dict.lowStockTooltip
                            .replace("{minStock}", String(part.minStock))
                            .replace("{unit}", part.unit)}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {dict.lowStock}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                    {part.catalogNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {part.manufacturer ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{part.unit}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {part.purchasePrice ? `${part.purchasePrice} zł` : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 text-xs">
                    {part.location ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canMutate && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(part)}
                            className="p-1.5 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-md transition-colors"
                            title={dict.editPart}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(part)}
                            className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                            title={dict.deletePart}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <SparePartFormModal
        open={showModal}
        onClose={handleCloseModal}
        onSubmit={save}
        formState={formState}
        onFormStateChange={setFormState}
        isSubmitting={isSubmitting}
        isEditing={editingPart !== null}
        partCategories={categories}
        machineGroups={machineGroups}
        dict={dict}
      />
    </>
  );
}
