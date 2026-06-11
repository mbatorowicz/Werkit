"use client";

import { Plus, Package } from "lucide-react";
import { type AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { durSparePartComboboxOptions } from "@/features/admin/dur/durSparePartComboboxOptions";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import { WorkOrderSparePartAddForm } from "./WorkOrderSparePartAddForm";
import { WorkOrderSparePartsTable } from "./WorkOrderSparePartsTable";
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
        <WorkOrderSparePartsTable parts={parts} durDict={durDict} onRemovePart={handleRemovePart} />
      )}
    </div>
  );
}
