"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Cog, Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import {
  useSparePartsAdminData,
  type SparePartsAdminAlertContext,
} from "@/features/admin/dur/useSparePartsAdminData";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { SparePart, SparePartInput } from "@/types/dur";

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

  const { parts, categories, machineCategories, isLoading, fetchData } =
    useSparePartsAdminData(alertCtxRef);

  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePart | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCatalogNumber, setFormCatalogNumber] = useState("");
  const [formManufacturer, setFormManufacturer] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formPurchasePrice, setFormPurchasePrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMinStock, setFormMinStock] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formCategoryIds, setFormCategoryIds] = useState<number[]>([]);
  const [formMachineCategoryIds, setFormMachineCategoryIds] = useState<number[]>([]);

  useEffect(() => {
    alertCtxRef.current = { apiErrors, listFetchFallback: "Failed to load spare parts." };
  }, [apiErrors]);

  useEffect(() => {
    queueMicrotask(() => void fetchData());
  }, [fetchData]);

  const openCreateModal = useCallback(() => {
    setEditingPart(null);
    setFormName("");
    setFormCatalogNumber("");
    setFormManufacturer("");
    setFormUnit("szt.");
    setFormPurchasePrice("");
    setFormDescription("");
    setFormMinStock("");
    setFormLocation("");
    setFormIsActive(true);
    setFormCategoryIds([]);
    setFormMachineCategoryIds([]);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((part: SparePart) => {
    setEditingPart(part);
    setFormName(part.name);
    setFormCatalogNumber(part.catalogNumber ?? "");
    setFormManufacturer(part.manufacturer ?? "");
    setFormUnit(part.unit);
    setFormPurchasePrice(part.purchasePrice ?? "");
    setFormDescription(part.description ?? "");
    setFormMinStock(part.minStock ?? "");
    setFormLocation(part.location ?? "");
    setFormIsActive(part.isActive);
    setFormCategoryIds(part.categoryIds ?? []);
    setFormMachineCategoryIds(part.machineCategoryIds ?? []);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingPart(null);
  }, []);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formName.trim()) {
        await appAlert({ message: durApiErrors.missing_part_name });
        return;
      }

      setIsSubmitting(true);
      try {
        const body: SparePartInput = {
          name: formName.trim(),
          catalogNumber: formCatalogNumber.trim() || undefined,
          manufacturer: formManufacturer.trim() || undefined,
          unit: formUnit.trim() || "szt.",
          purchasePrice: formPurchasePrice || null,
          description: formDescription.trim() || null,
          minStock: formMinStock || undefined,
          location: formLocation.trim() || undefined,
          isActive: formIsActive,
          categoryIds: formCategoryIds,
          machineCategoryIds: formMachineCategoryIds,
        };

        const url = editingPart ? `/api/dur/spare-parts/${editingPart.id}` : "/api/dur/spare-parts";
        const method = editingPart ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          await appAlert({
            message: (errData as { error?: string }).error ?? apiErrors.save_error,
          });
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
    },
    [
      formName,
      formCatalogNumber,
      formManufacturer,
      formUnit,
      formPurchasePrice,
      formDescription,
      formMinStock,
      formLocation,
      formIsActive,
      formCategoryIds,
      formMachineCategoryIds,
      editingPart,
      appAlert,
      durApiErrors,
      apiErrors,
      dict,
      closeModal,
      fetchData,
    ]
  );

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

  const toggleCategoryId = useCallback(
    (id: number, current: number[], setter: (ids: number[]) => void) => {
      setter(current.includes(id) ? current.filter((c) => c !== id) : [...current, id]);
    },
    []
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
            onClick={openCreateModal}
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
                            onClick={() => openEditModal(part)}
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
      <AdminModalShell
        open={showModal}
        onClose={closeModal}
        title={editingPart ? dict.editPart : dict.newPart}
        scrollableBody
        footer={
          <FormModalFooter
            formId="spare-part-form"
            onCancel={closeModal}
            submitLabel={isSubmitting ? dict.saving : dict.saveSuccess}
            isSubmitting={isSubmitting}
          />
        }
      >
        <form id="spare-part-form" onSubmit={(e) => void handleSave(e)} className="space-y-4 p-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {dict.fields.name} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={dict.fields.namePlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Catalog number + Manufacturer */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {dict.fields.catalogNumber}
              </label>
              <input
                type="text"
                value={formCatalogNumber}
                onChange={(e) => setFormCatalogNumber(e.target.value)}
                placeholder={dict.fields.catalogNumberPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {dict.fields.manufacturer}
              </label>
              <input
                type="text"
                value={formManufacturer}
                onChange={(e) => setFormManufacturer(e.target.value)}
                placeholder={dict.fields.manufacturerPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Unit + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {dict.fields.unit}
              </label>
              <input
                type="text"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder={dict.fields.unitPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {dict.fields.purchasePrice}
              </label>
              <input
                type="text"
                value={formPurchasePrice}
                onChange={(e) => setFormPurchasePrice(e.target.value)}
                placeholder={dict.fields.purchasePricePlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Min stock + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {dict.fields.minStock}
              </label>
              <input
                type="text"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <p className="mt-1 text-[10px] text-zinc-500">{dict.fields.minStockHint}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {dict.fields.location}
              </label>
              <input
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder={dict.fields.locationPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {dict.fields.description}
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder={dict.fields.descriptionPlaceholder}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {dict.fields.categories}
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && (
                <p className="text-xs text-zinc-500 italic">{dict.fields.categoriesPlaceholder}</p>
              )}
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategoryId(cat.id, formCategoryIds, setFormCategoryIds)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    formCategoryIds.includes(cat.id)
                      ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                      : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Machine categories */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {dict.fields.machineCategories}
            </label>
            <p className="text-[10px] text-zinc-500 mb-2">{dict.fields.machineCategoriesHint}</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {machineCategories.filter((c) => !c.isGroup).length === 0 && (
                <p className="text-xs text-zinc-500 italic">
                  {dict.fields.machineCategoriesPlaceholder}
                </p>
              )}
              {machineCategories
                .filter((c) => !c.isGroup)
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      toggleCategoryId(cat.id, formMachineCategoryIds, setFormMachineCategoryIds)
                    }
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      formMachineCategoryIds.includes(cat.id)
                        ? "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-300"
                        : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-600 text-emerald-500 focus:ring-emerald-500/50"
            />
            <label htmlFor="isActive" className="text-sm text-zinc-700 dark:text-zinc-300">
              {dict.fields.isActive}
            </label>
            <span className="text-[10px] text-zinc-500">{dict.fields.isActiveHint}</span>
          </div>
        </form>
      </AdminModalShell>
    </>
  );
}
