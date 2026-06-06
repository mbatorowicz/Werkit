"use client";

import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { SparePartFormFields } from "./SparePartFormFields";
import type { SparePartFormState } from "./sparePartFormTypes";
import type { SparePartCategory } from "@/types/dur";
import type { ResourceGroupOption } from "@/features/admin/dur/useResourceGroups";
import type { AppDictionary } from "@/i18n/types";

type Dict = AppDictionary["dur"]["spareParts"];
type SharedDict = AppDictionary["admin"]["shared"];

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
  dict: Dict;
  sharedDict: SharedDict;
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
  sharedDict,
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
        className="p-6"
      >
        <SparePartFormFields
          formState={formState}
          onFormStateChange={onFormStateChange}
          isEditing={isEditing}
          partCategories={partCategories}
          machineGroups={machineGroups}
          sharedDict={sharedDict}
          dict={dict}
        />
      </form>
    </AdminModalShell>
  );
}
