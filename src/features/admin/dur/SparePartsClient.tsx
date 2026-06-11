"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import { useAdminAbility } from "@/components/Admin/AdminAbilityProvider";
import {
  useSparePartsAdminData,
  type SparePartsAdminAlertContext,
} from "@/features/admin/dur/useSparePartsAdminData";
import { useResourceGroups } from "@/features/admin/dur/useResourceGroups";
import { useSparePartForm } from "@/features/admin/dur/useSparePartForm";
import { SparePartFormModal } from "@/features/admin/dur/SparePartFormModal";
import { SparePartsCategoryPanel } from "@/features/admin/dur/SparePartsCategoryPanel";
import { SparePartsTablePanel } from "@/features/admin/dur/SparePartsTablePanel";
import { SparePartStockAdjustModal } from "@/features/admin/dur/SparePartStockAdjustModal";
import { useAppDialog } from "@/components/AppDialogProvider";
import type { SparePart } from "@/types/dur";

export default function SparePartsClient() {
  const { canMutate } = useAdminAbility();
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();

  const dictionary = useDictionary();
  const dict = dictionary.dur.spareParts;
  const apiErrors = dictionary.apiErrors as Record<string, string>;
  const durApiErrors = dictionary.dur.apiErrors as Record<string, string>;

  const alertCtxRef = useRef<SparePartsAdminAlertContext>({
    apiErrors,
    listFetchFallback: dict.fetchError,
  });

  const { parts, categories, isLoading, fetchData } = useSparePartsAdminData(alertCtxRef);
  const { groups: machineGroups, fetchGroups } = useResourceGroups();

  const leafCategories = useMemo(() => categories.filter((c) => !c.isGroup), [categories]);

  const [showModal, setShowModal] = useState(false);
  const [adjustingPart, setAdjustingPart] = useState<SparePart | null>(null);

  useEffect(() => {
    alertCtxRef.current = { apiErrors, listFetchFallback: dict.fetchError };
  }, [apiErrors, dict.fetchError]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchData();
      void fetchGroups();
    });
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

  const { formState, setFormState, editingPart, isSubmitting, openCreate, openEdit, save } =
    useSparePartForm({
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

  return (
    <>
      <SparePartsCategoryPanel
        apiErrors={apiErrors}
        apiErrorFallback={dict.fetchError}
        categories={categories}
        isLoading={isLoading}
        canMutate={canMutate}
        fetchData={fetchData}
      />

      <SparePartsTablePanel
        dict={dict}
        parts={parts}
        isLoading={isLoading}
        canMutate={canMutate}
        onAddPart={handleOpenCreate}
        onEditPart={handleOpenEdit}
        onDeletePart={handleDelete}
        onAdjustStock={canMutate ? setAdjustingPart : undefined}
      />

      <SparePartFormModal
        open={showModal}
        onClose={handleCloseModal}
        onSubmit={save}
        formState={formState}
        onFormStateChange={setFormState}
        isSubmitting={isSubmitting}
        isEditing={editingPart !== null}
        partCategories={leafCategories}
        machineGroups={machineGroups}
        dict={dict}
        sharedDict={dictionary.admin.shared}
      />

      <SparePartStockAdjustModal
        open={adjustingPart !== null}
        part={adjustingPart}
        onClose={() => setAdjustingPart(null)}
        onSaved={async () => {
          await fetchData();
          await appAlert({ message: warehouseCommonLabels(dictionary).adjustment.saveSuccess });
        }}
      />
    </>
  );
}
