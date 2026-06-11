"use client";

import { Plus, Trash2, Package } from "lucide-react";
import { type AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { durSparePartComboboxOptions } from "@/features/admin/dur/durSparePartComboboxOptions";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { parseDecimalInput } from "@/lib/decimalInput";
import { useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import { WorkOrderSparePartAddForm } from "./WorkOrderSparePartAddForm";
import { useWorkOrderSpareParts } from "./useWorkOrderSpareParts";

type Props = {
  workOrderId: number | null;
  /** Gdy `null` — zlecenie nie zostało jeszcze zapisane, sekcja nieaktywna. */
  orderType: string | null;
  /** ID kategorii maszyny — filtruje katalog części tylko do kompatybilnych z tą maszyną. */
  resourceGroupId: number | null;
};

const FIELD = "space-y-1.5";
const LABEL =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400";

/**
 * Sekcja części zamiennych w formularzu zlecenia naprawczego (admin).
 * Widoczna tylko gdy orderType === 'machine_repair' i workOrderId !== null.
 */
export default function WorkOrderSparePartsSection({
  workOrderId,
  orderType,
  resourceGroupId,
}: Props) {
  const { durEnabled } = useAdminAbility();
  const dict = useDictionary();
  const durDict = dict.dur.workOrderSpareParts;
  const wh = warehouseCommonLabels(dict);
  const adminOrdersDict = dict.admin.orders;
  const {
    parts,
    isLoading,
    isAdding,
    showAddForm,
    setShowAddForm,
    selectedPartId,
    setSelectedPartId,
    addQuantity,
    setAddQuantity,
    addUnitPrice,
    setAddUnitPrice,
    addNotes,
    setAddNotes,
    handleAddPart,
    handleRemovePart,
    catalogItems,
    isRepair,
    hasOrderId,
  } = useWorkOrderSpareParts({ workOrderId, orderType, resourceGroupId });

  const catalogOptions: AdminSearchComboboxOption[] = durSparePartComboboxOptions(
    catalogItems,
    wh.stockSublabel
  );

  // ── Render ──
  if (!durEnabled || !isRepair) return null;

  return (
    <div className={FIELD}>
      <div className="flex items-center justify-between">
        <label className={LABEL}>
          <Package className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />
          {adminOrdersDict.spareParts}
        </label>
        {hasOrderId && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition"
          >
            <Plus className="h-3 w-3" />
            {adminOrdersDict.addSparePart}
          </button>
        )}
      </div>

      {/* Komunikat gdy brak ID zlecenia (przed zapisem) */}
      {!hasOrderId && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
          Zapisz zlecenie przed dodaniem części.
        </p>
      )}

      {/* Formularz dodawania */}
      {showAddForm && hasOrderId && (
        <WorkOrderSparePartAddForm
          catalogOptions={catalogOptions}
          selectedPartId={selectedPartId}
          onSelectedPartIdChange={setSelectedPartId}
          addQuantity={addQuantity}
          onAddQuantityChange={setAddQuantity}
          addUnitPrice={addUnitPrice}
          onAddUnitPriceChange={setAddUnitPrice}
          addNotes={addNotes}
          onAddNotesChange={setAddNotes}
          isAdding={isAdding}
          onSubmit={handleAddPart}
          onCancel={() => {
            setShowAddForm(false);
            setSelectedPartId("");
            setAddQuantity("1");
            setAddUnitPrice("");
            setAddNotes("");
          }}
        />
      )}

      {/* Lista części */}
      {isLoading ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Wczytywanie...</p>
      ) : parts.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{durDict.empty}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.name}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.catalogNumber}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.quantity}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.unitPrice}
                </th>
                <th className="px-3 py-2 text-right font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.totalPrice}
                </th>
                <th className="px-3 py-2 text-center font-semibold text-zinc-500 dark:text-zinc-400">
                  {durDict.table.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {parts.map((p) => {
                const qty = parseDecimalInput(p.quantity) ?? 0;
                const price = parseDecimalInput(p.unitPrice ?? "") ?? 0;
                const total = qty * price;
                return (
                  <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-3 py-2 font-medium text-zinc-900 dark:text-white">
                      {p.partName}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{p.partSku}</td>
                    <td className="px-3 py-2 text-right text-zinc-900 dark:text-white">
                      {p.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                      {p.unitPrice ? `${p.unitPrice} zł` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-white">
                      {total > 0 ? `${total.toFixed(2)} zł` : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePart(p.id)}
                        className="text-red-500 hover:text-red-400 transition"
                        title={durDict.returnPart ?? durDict.removePart}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Podsumowanie */}
          {parts.length > 0 && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">
                {durDict.totals.partsCount.replace("{count}", String(parts.length))}
              </span>
              {(() => {
                const totalValue = parts.reduce((sum, p) => {
                  const qty = parseDecimalInput(p.quantity) ?? 0;
                  const price = parseDecimalInput(p.unitPrice ?? "") ?? 0;
                  return sum + qty * price;
                }, 0);
                return totalValue > 0 ? (
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {durDict.totals.totalValue.replace("{value}", `${totalValue.toFixed(2)} zł`)}
                  </span>
                ) : null;
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
