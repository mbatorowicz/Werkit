"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, AlertTriangle, Package } from "lucide-react";
import { getDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { useAppDialog } from "@/components/AppDialogProvider";
import { narrowInventory } from "@/lib/narrow/dur";
import type { SparePartInventory, InventoryAdjustmentInput } from "@/types/dur";

export default function InventoryClient() {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert } = useAppDialog();

  const dictionary = getDictionary();
  const dict = dictionary.dur.warehouse.inventory;
  const apiErrors = dictionary.apiErrors as Record<string, string>;

  const [inventory, setInventory] = useState<SparePartInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingPart, setAdjustingPart] = useState<SparePartInventory | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dur/inventory");
      const data = await res.json();
      setInventory(narrowInventory(data));
    } catch {
      setInventory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void fetchData());
  }, [fetchData]);

  const openAdjustModal = useCallback((item: SparePartInventory) => {
    setAdjustingPart(item);
    setAdjustQuantity(String(item.quantity));
    setAdjustNotes("");
    setShowAdjustModal(true);
  }, []);

  const closeAdjustModal = useCallback(() => {
    setShowAdjustModal(false);
    setAdjustingPart(null);
    setAdjustQuantity("");
    setAdjustNotes("");
  }, []);

  const handleAdjust = useCallback(async () => {
    if (!adjustingPart) return;
    const qty = Number(adjustQuantity);
    if (isNaN(qty) || qty < 0) {
      await appAlert({ message: "Nieprawidłowa ilość." });
      return;
    }
    setIsSubmitting(true);
    try {
      const body: InventoryAdjustmentInput = {
        partId: adjustingPart.partId,
        quantity: String(qty),
        notes: adjustNotes || null,
      };
      const res = await fetch("/api/dur/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        await appAlert({ message: (err as { error?: string }).error || apiErrors.save_error || "Błąd zapisu." });
        return;
      }
      await fetchData();
      closeAdjustModal();
    } catch {
      await appAlert({ message: apiErrors.fetch_error || "Błąd sieci." });
    } finally {
      setIsSubmitting(false);
    }
  }, [adjustingPart, adjustQuantity, adjustNotes, appAlert, apiErrors, fetchData, closeAdjustModal]);

  const filtered = inventory.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.partName?.toLowerCase() || "").includes(q) ||
      (item.partCatalogNumber?.toLowerCase() || "").includes(q)
    );
  });

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{dict.title}</h1>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj po nazwie, katalogu…"
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">{dictionary.admin.ui.searchNoResults || "Ładowanie…"}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Package className="w-12 h-12 mx-auto mb-3 text-zinc-300 dark:text-zinc-600" />
          <p>{searchQuery ? "Brak wyników dla tego zapytania." : dict.empty}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{dict.part}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{dict.catalogNumber}</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">{dict.quantity}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{dict.unit}</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-600 dark:text-zinc-400">{dict.updatedAt}</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-600 dark:text-zinc-400">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {filtered.map((item) => {
                const qty = Number(item.quantity);
                const isLowStock = qty <= 0;
                return (
                  <tr
                    key={item.partId}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {item.partName}
                        {isLowStock && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{item.partCatalogNumber || "—"}</td>
                    <td className={`px-4 py-3 text-right font-mono tabular-nums ${isLowStock ? "text-red-600 dark:text-red-400 font-semibold" : "text-zinc-900 dark:text-white"}`}>
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{item.partUnit || "—"}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canMutate && (
                        <button
                          onClick={() => openAdjustModal(item)}
                          className="text-xs px-3 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                          Korekta
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjustment Modal */}
      {adjustingPart && (
        <AdminModalShell
          open={showAdjustModal}
          title={dictionary.dur.warehouse.adjustment.title}
          onClose={closeAdjustModal}
          closeOnBackdropClick={false}
          footer={
            <FormModalFooter
              formId="adjustment-form"
              onCancel={closeAdjustModal}
              submitLabel="Zapisz"
              isSubmitting={isSubmitting}
            />
          }
        >
          <form
            onSubmit={(e) => { e.preventDefault(); void handleAdjust(); }}
            id="adjustment-form"
            className="space-y-4"
          >
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {adjustingPart.partName} ({adjustingPart.partCatalogNumber || "—"}) — aktualny stan:{" "}
              <strong>{adjustingPart.quantity}</strong> {adjustingPart.partUnit || "szt."}
            </p>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {dictionary.dur.warehouse.adjustment.quantityLabel}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value)}
                placeholder={dictionary.dur.warehouse.adjustment.quantityPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {dictionary.dur.warehouse.adjustment.notesLabel}
              </label>
              <textarea
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                placeholder={dictionary.dur.warehouse.adjustment.notesPlaceholder}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>
          </form>
        </AdminModalShell>
      )}
    </>
  );
}
