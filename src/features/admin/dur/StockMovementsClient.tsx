"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { useDictionary } from "@/i18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { StockMovementsTable } from "./StockMovementsTable";
import { StockMovementFormsModal } from "./StockMovementFormsModal";
import { StockIssueTotalsSummary } from "./StockIssueTotalsSummary";
import { useStockMovementsData } from "./useStockMovementsData";
import { useStockMovementRefs } from "./useStockMovementRefs";
import { useStockMovementForms } from "./useStockMovementForms";
import { useDurSparePartCatalog } from "@/features/admin/dur/useDurSparePartCatalog";
import { durSparePartComboboxOptions } from "@/features/admin/dur/durSparePartComboboxOptions";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";

type Tab = "receipts" | "issues";

export default function StockMovementsClient() {
  const { canMutate } = useAdminAbility();

  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const dWh = dictionary.dur.warehouse;

  const [tab, setTab] = useState<Tab>("issues");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  const { items: catalogItems, isLoading: catalogLoading, fetchCatalog } = useDurSparePartCatalog();
  const { workOrderOptions, userOptions, refsLoading, fetchRefs } = useStockMovementRefs();

  const partById = useMemo(() => new Map(catalogItems.map((p) => [p.id, p])), [catalogItems]);

  const partOptions = useMemo(
    () => durSparePartComboboxOptions(catalogItems, wh.stockSublabel),
    [catalogItems, wh.stockSublabel]
  );

  const { isLoading, fetchData, filteredReceipts, filteredIssues, issueTotalsByPart } =
    useStockMovementsData({ tab, searchQuery, partById });

  const closeModal = useCallback(() => setShowModal(false), []);

  const forms = useStockMovementForms({ tab, catalogItems, fetchData, fetchCatalog, closeModal });
  const { resetForms } = forms;

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
      void fetchCatalog();
    });
  }, [fetchData, fetchCatalog]);

  const openModal = useCallback(() => {
    resetForms();
    setShowModal(true);
    void fetchCatalog();
    if (tab === "issues") {
      void fetchRefs();
    }
  }, [resetForms, fetchCatalog, fetchRefs, tab]);

  useEffect(() => {
    if (!showModal || tab !== "issues") return;
    queueMicrotask(() => void fetchRefs());
  }, [showModal, tab, fetchRefs]);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{wh.movementsTitle}</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{dWh.movementsSubtitle}</p>
      </div>

      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-2">
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
        {canMutate ? (
          <button
            type="button"
            onClick={openModal}
            className={cn("inline-flex items-center gap-2", BTN_PRIMARY_COMPACT)}
          >
            <Plus className="h-4 w-4" />
            {tab === "receipts" ? wh.addReceipt : wh.addIssue}
          </button>
        ) : null}
      </div>

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={dWh.movementsSearchPlaceholder}
      />

      <StockIssueTotalsSummary items={issueTotalsByPart} />

      <StockMovementsTable
        tab={tab}
        isLoading={isLoading}
        searchQuery={searchQuery}
        filteredReceipts={filteredReceipts}
        filteredIssues={filteredIssues}
        partById={partById}
      />

      <StockMovementFormsModal
        open={showModal && canMutate}
        tab={tab}
        onClose={closeModal}
        forms={forms}
        partOptions={partOptions}
        workOrderOptions={workOrderOptions}
        userOptions={userOptions}
        catalogLoading={catalogLoading}
        refsLoading={refsLoading}
      />
    </>
  );
}
