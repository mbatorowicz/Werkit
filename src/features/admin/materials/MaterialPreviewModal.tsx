"use client";

import { AdminPreviewField } from "@/components/Admin/AdminPreviewField";
import { AdminPreviewModal } from "@/components/Admin/AdminPreviewModal";
import { CategoryColorBadge } from "@/components/CategoryColorBadge";
import { formatDict, useDictionary } from "@/i18n";
import { warehouseCommonLabels } from "@/lib/warehouseI18n";
import { DEFAULT_MATERIAL_MEASURE_UNIT } from "@/lib/measureUnits";
import type { AppDictionary } from "@/i18n/types";
import type { MaterialCategory, MaterialRow } from "./types";

interface MaterialPreviewModalProps {
  material: MaterialRow | null;
  categories: MaterialCategory[];
  dict: AppDictionary["admin"]["materials"];
  machDict: AppDictionary["admin"]["machines"];
  canMutate: boolean;
  onClose: () => void;
  onEditMaterial: (material: MaterialRow) => void;
}

export function MaterialPreviewModal({
  material,
  categories,
  dict,
  machDict,
  canMutate,
  onClose,
  onEditMaterial,
}: MaterialPreviewModalProps) {
  const dictionary = useDictionary();
  const wh = warehouseCommonLabels(dictionary);
  const sharedDict = dictionary.admin.shared;
  const ui = dictionary.admin.ui;

  return (
    <AdminPreviewModal
      open={material != null}
      onClose={onClose}
      title={ui.previewTitle}
      canEdit={canMutate}
      onEdit={
        material
          ? () => {
              onClose();
              onEditMaterial(material);
            }
          : undefined
      }
      editLabel={machDict.editTitle}
    >
      {material ? (
        <>
          <AdminPreviewField label={dict.nameLabel} value={material.name} />
          <AdminPreviewField label="ID" value={`#${material.id}`} />
          <AdminPreviewField label={dict.matCatLabel}>
            <div className="flex flex-wrap gap-1">
              {categories
                .filter((c) => (material.categoryIds ?? []).includes(c.id))
                .map((c) => (
                  <CategoryColorBadge key={c.id} label={c.name} color={c.color} />
                ))}
              {(material.categoryIds?.length ?? 0) === 0 ? (
                <span className="italic text-zinc-500">{machDict.noCategoryBadge}</span>
              ) : null}
            </div>
          </AdminPreviewField>
          <AdminPreviewField
            label={sharedDict.measureUnitLabel}
            value={material.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT}
          />
          <AdminPreviewField
            label={wh.stockColumn}
            value={formatDict(wh.stockWithUnit, {
              qty: material.stockQuantity ?? "0",
              unit: material.unit ?? DEFAULT_MATERIAL_MEASURE_UNIT,
            })}
          />
          {material.minStock ? (
            <AdminPreviewField label={dict.minStockLabel} value={material.minStock} />
          ) : null}
          {material.location ? (
            <AdminPreviewField label={dict.locationLabel} value={material.location} />
          ) : null}
        </>
      ) : null}
    </AdminPreviewModal>
  );
}
