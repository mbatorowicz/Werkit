"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Package } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { formatDict, useDictionary } from "@/i18n";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import type { AdminSearchComboboxOption } from "@/components/Admin/AdminSearchCombobox";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import type { MaterialRow } from "@/features/admin/materials/types";
import { MaterialStockMovementModal } from "./MaterialStockMovementModal";
import { MaterialMovementsTableSection } from "./MaterialMovementsTableSection";
import { useMaterialStockMovements } from "./useMaterialStockMovements";
import { useMaterialMovementForm } from "./useMaterialMovementForm";

type Tab = "receipts" | "issues";

type Props = {
  materials: MaterialRow[];
  onRefreshMaterials: () => void;
};

export function MaterialStockMovementsClient({ materials, onRefreshMaterials }: Props) {
  const { canMutate } = useAdminAbility();
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const matWh = dictionary.admin.materials.warehouse;

  const [tab, setTab] = useState<Tab>("issues");
  const [searchQuery, setSearchQuery] = useState("");

  const materialById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);

  const materialOptions = useMemo((): AdminSearchComboboxOption[] => {
    return materials.map((m) => ({
      id: String(m.id),
      label: m.name,
      sublabel: formatDict(wh.stockSublabel, {
        qty: m.stockQuantity ?? "0",
        unit: m.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
      }),
    }));
  }, [materials, wh.stockSublabel]);

  const { isLoading, loadMovements, filteredReceipts, filteredIssues, issueTotalsByMaterial } =
    useMaterialStockMovements({ tab, searchQuery, materialById });

  const {
    showModal,
    setShowModal,
    isSubmitting,
    materialId,
    setMaterialId,
    quantity,
    setQuantity,
    unitPrice,
    setUnitPrice,
    invoiceNumber,
    setInvoiceNumber,
    notes,
    setNotes,
    openModal,
    handleSubmit,
  } = useMaterialMovementForm({ tab, loadMovements, onRefreshMaterials });

  const selectedMaterial = useMemo(
    () => materials.find((m) => String(m.id) === materialId) ?? null,
    [materials, materialId]
  );

  useEffect(() => {
    queueMicrotask(() => void loadMovements());
  }, [loadMovements]);

  return (
    <section className="border-t border-zinc-200 pt-12 dark:border-zinc-800/80">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-900 dark:text-white">
            <Package className="h-6 w-6 text-emerald-500" />
            {wh.movementsTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{matWh.movementsSubtitle}</p>
        </div>
        {canMutate ? (
          <button
            type="button"
            onClick={openModal}
            className={cn("flex items-center gap-2", BTN_PRIMARY_COMPACT)}
          >
            <Plus className="h-4 w-4" />
            {tab === "receipts" ? wh.addReceipt : wh.addIssue}
          </button>
        ) : null}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("issues")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "issues"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {wh.tabIssues}
        </button>
        <button
          type="button"
          onClick={() => setTab("receipts")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "receipts"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {wh.tabReceipts}
        </button>
      </div>

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={matWh.movementsSearchPlaceholder}
      />

      <MaterialMovementsTableSection
        tab={tab}
        isLoading={isLoading}
        searchQuery={searchQuery}
        filteredReceipts={filteredReceipts}
        filteredIssues={filteredIssues}
        issueTotalsByMaterial={issueTotalsByMaterial}
        materialById={materialById}
      />

      <MaterialStockMovementModal
        open={showModal && canMutate}
        tab={tab}
        isSubmitting={isSubmitting}
        materialOptions={materialOptions}
        selectedMaterial={selectedMaterial}
        materialId={materialId}
        quantity={quantity}
        unitPrice={unitPrice}
        invoiceNumber={invoiceNumber}
        notes={notes}
        onMaterialIdChange={setMaterialId}
        onQuantityChange={setQuantity}
        onUnitPriceChange={setUnitPrice}
        onInvoiceNumberChange={setInvoiceNumber}
        onNotesChange={setNotes}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
