"use client";

import { Edit2, Package, Trash2 } from "lucide-react";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import type { CatalogMaterialRow as CatalogMaterialRowType } from "@/lib/materialCatalogTree";

interface CatalogMaterialRowProps {
  material: CatalogMaterialRowType;
  depth: number;
  categoryColor?: string | null;
  materialBadge?: string;
  canMutate: boolean;
  onPreview?: (material: CatalogMaterialRowType) => void;
  onEdit?: (material: CatalogMaterialRowType) => void;
  onDelete?: (id: number) => void;
}

export default function CatalogMaterialRow({
  material,
  depth,
  categoryColor,
  materialBadge,
  canMutate,
  onPreview,
  onEdit,
  onDelete,
}: CatalogMaterialRowProps) {
  return (
    <div
      key={`mat-${material.id}-${depth}-${String(categoryColor)}`}
      role={onPreview ? "button" : undefined}
      tabIndex={onPreview ? 0 : undefined}
      onClick={onPreview ? () => onPreview(material) : undefined}
      onKeyDown={
        onPreview
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPreview(material);
              }
            }
          : undefined
      }
      className={`group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900${onPreview ? " cursor-pointer" : ""}`}
      style={{ marginLeft: `${depth * 1.25}rem` }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="w-5 shrink-0" />
        <div
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded shadow-sm"
          style={{ backgroundColor: categoryColor || "#78716c" }}
        >
          <Package className="h-2.5 w-2.5 text-white/90" />
        </div>
        <span className="truncate font-medium text-zinc-900 dark:text-zinc-200">{material.name}</span>
        {materialBadge ? (
          <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            {materialBadge}
          </span>
        ) : null}
      </div>
      {canMutate && onEdit && onDelete ? (
        <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              stopRowActionClick(e);
              onEdit(material);
            }}
            className="rounded-md p-1.5 text-zinc-600 transition hover:text-amber-500 dark:text-zinc-400"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              stopRowActionClick(e);
              onDelete(material.id);
            }}
            className="rounded-md p-1.5 text-zinc-600 transition hover:text-red-500 dark:text-zinc-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
