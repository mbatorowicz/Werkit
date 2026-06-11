"use client";

import { Layers, Plus } from "lucide-react";
import { BTN_PRIMARY_COMPACT_SM } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";

export interface CatalogTreeHeaderProps {
  title: string;
  subtitle?: string;
  addCategoryLabel: string;
  addMaterialLabel?: string;
  canMutate: boolean;
  onAddCategory: () => void;
  onAddMaterial?: () => void;
}

export function CatalogTreeHeader({
  title,
  subtitle,
  addCategoryLabel,
  addMaterialLabel,
  canMutate,
  onAddCategory,
  onAddMaterial,
}: CatalogTreeHeaderProps) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h2 className="flex items-center gap-2 pt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
          <Layers className="h-5 w-5 text-amber-500" /> {title}
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
      </div>
      {canMutate ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAddCategory}
            className={cn("flex items-center gap-2", BTN_PRIMARY_COMPACT_SM)}
          >
            <Plus className="h-4 w-4" /> {addCategoryLabel}
          </button>
          {onAddMaterial && addMaterialLabel ? (
            <button
              type="button"
              onClick={onAddMaterial}
              className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-500/20 dark:border-amber-500/30 dark:text-amber-200"
            >
              <Plus className="h-4 w-4" /> {addMaterialLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
