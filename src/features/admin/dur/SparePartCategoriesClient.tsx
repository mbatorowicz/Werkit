"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FolderTree, Plus, Pencil, Trash2 } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { SparePartCategory, SparePartCategoryInput } from "@/types/dur";
import { narrowSparePartCategories } from "@/lib/narrow/dur";

export default function SparePartCategoriesClient() {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();

  const dictionary = getDictionary();
  const dict = dictionary.dur.categories;
  const shared = dictionary.dur.categories.shared;
  const nav = dictionary.admin.sidebar;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const durApiErrors = dictionary.dur.apiErrors as Record<string, string>;

  const [categories, setCategories] = useState<SparePartCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<SparePartCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formIsGroup, setFormIsGroup] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formColor, setFormColor] = useState("");

  const fetchRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchRef.current;
    setIsLoading(true);
    try {
      const res = await fetch("/api/dur/spare-part-categories");
      const data = narrowSparePartCategories(await res.json());
      if (id === fetchRef.current) setCategories(data);
    } catch {
      console.warn("Failed to load spare part categories.");
    } finally {
      if (id === fetchRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void fetchData());
  }, [fetchData]);

  const openCreateModal = useCallback(() => {
    setEditingCat(null);
    setFormName("");
    setFormParentId(null);
    setFormIsGroup(false);
    setFormSortOrder(0);
    setFormColor("");
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((cat: SparePartCategory) => {
    setEditingCat(cat);
    setFormName(cat.name);
    setFormParentId(cat.parentId);
    setFormIsGroup(cat.isGroup);
    setFormSortOrder(cat.sortOrder);
    setFormColor(cat.color ?? "");
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingCat(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formName.trim()) {
      await appAlert({ message: durApiErrors.missing_category_name });
      return;
    }

    setIsSubmitting(true);
    try {
      const body: SparePartCategoryInput = {
        name: formName.trim(),
        parentId: formParentId,
        isGroup: formIsGroup,
        sortOrder: formSortOrder,
        color: formColor || undefined,
      };

      const url = editingCat ? `/api/dur/spare-part-categories/${editingCat.id}` : "/api/dur/spare-part-categories";
      const method = editingCat ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        await appAlert({ message: (errData as { error?: string }).error ?? apiErrors.save_error });
        return;
      }

      closeModal();
      await fetchData();
    } catch {
      await appAlert({ message: apiErrors.save_error });
    } finally {
      setIsSubmitting(false);
    }
  }, [formName, formParentId, formIsGroup, formSortOrder, formColor, editingCat, appAlert, durApiErrors, apiErrors, closeModal, fetchData]);

  const handleDelete = useCallback(async (cat: SparePartCategory) => {
    const confirmed = await appConfirm({ message: dict.confirmDelete, variant: "danger" });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/dur/spare-part-categories/${cat.id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        await appAlert({ message: (errData as { error?: string }).error ?? apiErrors.delete_error });
        return;
      }
      await fetchData();
    } catch {
      await appAlert({ message: apiErrors.delete_error });
    }
  }, [appConfirm, appAlert, dict, apiErrors, fetchData]);

  // Build tree for display
  const rootCategories = categories.filter((c) => c.parentId === null);
  const childrenOf = (parentId: number) => categories.filter((c) => c.parentId === parentId);

  const renderCategoryRow = (cat: SparePartCategory, depth = 0) => (
    <div key={cat.id}>
      <div
        className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors rounded-lg"
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {cat.isGroup ? (
            <FolderTree className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color ?? "#a1a1aa" }} />
          )}
          <span className="text-sm font-medium text-zinc-900 dark:text-white truncate">
            {cat.name}
          </span>
          {cat.isGroup && (
            <span className="text-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
              {shared.badgeGroup}
            </span>
          )}
        </div>
        {canMutate && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => openEditModal(cat)}
              className="p-1.5 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-md transition-colors"
              title={shared.modalEdit}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(cat)}
              className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
              title="Usuń"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {childrenOf(cat.id).map((child) => renderCategoryRow(child, depth + 1))}
    </div>
  );

  // Available parents for the form (only groups, excluding self and descendants when editing)
  const availableParents = categories.filter((c) => c.isGroup && (!editingCat || c.id !== editingCat.id));

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <FolderTree className="h-6 w-6 text-emerald-500" />
          {dict.title}
        </h1>
        {canMutate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {shared.add}
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
      {!isLoading && categories.length === 0 && (
        <div className="text-center py-12">
          <FolderTree className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">{dict.empty}</p>
        </div>
      )}

      {/* Category tree */}
      {!isLoading && categories.length > 0 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-2">
          {rootCategories.map((cat) => renderCategoryRow(cat))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AdminModalShell
        open={showModal}
        onClose={closeModal}
        title={editingCat ? shared.modalEdit : shared.modalCreate}
        scrollableBody
        footer={
          <FormModalFooter
            onCancel={closeModal}
            submitLabel={shared.save}
            isSubmitting={isSubmitting}
          />
        }
      >
        <div className="space-y-4 p-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {shared.fieldName} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={dict.namePlaceholder}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Parent */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {shared.parentLabel}
            </label>
            <select
              value={formParentId ?? ""}
              onChange={(e) => setFormParentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">{shared.parentNone}</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Is group */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isGroup"
              checked={formIsGroup}
              onChange={(e) => setFormIsGroup(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-600 text-emerald-500 focus:ring-emerald-500/50"
            />
            <label htmlFor="isGroup" className="text-sm text-zinc-700 dark:text-zinc-300">
              {shared.isGroupLabel}
            </label>
            <span className="text-[10px] text-zinc-500">{shared.isGroupHint}</span>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {shared.sortOrderLabel}
            </label>
            <input
              type="number"
              min="0"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              {shared.colorLabel}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formColor || "#a1a1aa"}
                onChange={(e) => setFormColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-zinc-200 dark:border-zinc-700"
              />
              <span className="text-xs text-zinc-500">{shared.colorHint}</span>
            </div>
          </div>
        </div>
      </AdminModalShell>
    </>
  );
}
