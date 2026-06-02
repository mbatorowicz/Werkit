"use client";

import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { SparePartFormFields } from "./SparePartFormFields";
import type { SparePartFormState } from "./sparePartFormTypes";
import type { SparePartCategory } from "@/types/dur";
import type { ResourceGroupOption } from "@/features/admin/dur/useResourceGroups";

interface SparePartFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formState: SparePartFormState;
  onFormStateChange: (state: SparePartFormState) => void;
  isSubmitting: boolean;
  isEditing: boolean;
  partCategories: SparePartCategory[];
  machineGroups: ResourceGroupOption[];
  dict: {
    newPart: string;
    editPart: string;
    save: string;
    saving: string;
    fields: {
      name: string;
      namePlaceholder: string;
      catalogNumber: string;
      catalogNumberPlaceholder: string;
      manufacturer: string;
      manufacturerPlaceholder: string;
      unit: string;
      unitPlaceholder: string;
      purchasePrice: string;
      purchasePricePlaceholder: string;
      description: string;
      descriptionPlaceholder: string;
      minStock: string;
      minStockHint: string;
      location: string;
      locationPlaceholder: string;
      isActive: string;
      isActiveHint: string;
      categories: string;
      categoriesPlaceholder: string;
      machineCategories: string;
      machineCategoriesHint: string;
      machineCategoriesPlaceholder: string;
    };
  };
}

export function SparePartFormModal({
  open,
  onClose,
  onSubmit,
  formState,
  onFormStateChange,
  isSubmitting,
  isEditing,
  partCategories,
  machineGroups,
  dict,
}: SparePartFormModalProps) {
  const title = isEditing ? dict.editPart : dict.newPart;
  const submitLabel = isSubmitting ? dict.saving : dict.save;

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={title}
      scrollableBody
      footer={
        <FormModalFooter
          formId="spare-part-form"
          onCancel={onClose}
          submitLabel={submitLabel}
          isSubmitting={isSubmitting}
        />
      }
    >
      <form
        id="spare-part-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4 p-6"
      >
        <SparePartFormFields
          formState={formState}
          onFormStateChange={onFormStateChange}
          isEditing={isEditing}
          partCategories={partCategories}
          machineGroups={machineGroups}
          dict={dict}
        />
      </form>
    </AdminModalShell>
  );
}
