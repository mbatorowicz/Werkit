"use client";

import { Fragment } from "react";
import { ChevronRight, Edit2, Folder, Trash2 } from "lucide-react";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import type { CategoryTreeNode } from "@/lib/categoryTree";
import type { CatalogMaterialRow as CatalogMaterialRowType } from "@/lib/materialCatalogTree";
import CatalogMaterialRow from "./CatalogMaterialRow";
import { CategoryColorDot } from "@/components/CategoryColorBadge";
import type { CatalogCategoryItem } from "./ExpandableCatalogTree";

interface CatalogTreeNodeProps<T extends CatalogCategoryItem> {
  node: CategoryTreeNode<T>;
  childMaterials: CatalogMaterialRowType[];
  isExpanded: boolean;
  categoryStatLong: string | null;
  categoryStatShort: string | null;
  materialStat: string | null;
  materialCount: number;
  groupBadge: string;
  stationaryBadge?: string;
  materialBadge?: string;
  canMutate: boolean;
  onToggle: (id: number) => void;
  onPreviewCategory?: (item: T) => void;
  onEditCategory: (item: T) => void;
  onDeleteCategory: (id: number) => void;
  onPreviewMaterial?: (material: CatalogMaterialRowType) => void;
  onEditMaterial?: (material: CatalogMaterialRowType) => void;
  onDeleteMaterial?: (id: number) => void;
  renderChildren: () => React.ReactNode;
}

export default function CatalogTreeNodeComponent<T extends CatalogCategoryItem>({
  node,
  childMaterials,
  isExpanded,
  categoryStatLong,
  categoryStatShort,
  materialStat,
  materialCount,
  groupBadge,
  stationaryBadge,
  materialBadge,
  canMutate,
  onToggle,
  onPreviewCategory,
  onEditCategory,
  onDeleteCategory,
  onPreviewMaterial,
  onEditMaterial,
  onDeleteMaterial,
  renderChildren,
}: CatalogTreeNodeProps<T>) {
  const hasChildren = node.children.length > 0 || childMaterials.length > 0;

  return (
    <Fragment key={`cat-${node.id}`}>
      <div
        role={onPreviewCategory ? "button" : undefined}
        tabIndex={onPreviewCategory ? 0 : undefined}
        onClick={onPreviewCategory ? () => onPreviewCategory(node) : undefined}
        onKeyDown={
          onPreviewCategory
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPreviewCategory(node);
                }
              }
            : undefined
        }
        className={`group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900${onPreviewCategory ? " cursor-pointer" : ""}`}
        style={{ marginLeft: `${node.depth * 1.25}rem` }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                stopRowActionClick(e);
                onToggle(node.id);
              }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-expanded={isExpanded}
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          {node.isGroup ? (
            <Folder className="h-4 w-4 shrink-0 text-amber-500" />
          ) : (
            <CategoryColorDot color={node.color} className="h-4 w-4 shrink-0 rounded shadow-sm" />
          )}
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-200">{node.name}</span>
          {node.isGroup ? (
            <span className="shrink-0 rounded bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {groupBadge}
            </span>
          ) : null}
          {!node.isGroup && node.isStationary && stationaryBadge ? (
            <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {stationaryBadge}
            </span>
          ) : null}
        </div>
        {(categoryStatLong || categoryStatShort || materialStat) && (
          <div className="ml-auto flex shrink-0 items-center gap-2 px-1 text-[11px] tabular-nums leading-tight text-zinc-500 sm:gap-3 sm:text-xs">
            {categoryStatShort ? (
              <span className="sm:hidden" title={categoryStatLong ?? categoryStatShort}>
                {categoryStatShort}
              </span>
            ) : null}
            {categoryStatLong ? (
              <span className="hidden max-w-[9rem] truncate sm:inline" title={categoryStatLong}>
                {categoryStatLong}
              </span>
            ) : null}
            {materialStat ? (
              <span
                className={
                  materialCount > 0
                    ? "font-medium text-amber-800/90 dark:text-amber-300/90"
                    : "text-zinc-400 dark:text-zinc-500"
                }
              >
                {materialStat}
              </span>
            ) : null}
          </div>
        )}
        {canMutate ? (
          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => {
                stopRowActionClick(e);
                onEditCategory(node);
              }}
              className="rounded-md p-1.5 text-zinc-600 transition hover:text-amber-500 dark:text-zinc-400"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                stopRowActionClick(e);
                onDeleteCategory(node.id);
              }}
              className="rounded-md p-1.5 text-zinc-600 transition hover:text-red-500 dark:text-zinc-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      {isExpanded ? (
        <>
          {renderChildren()}
          {!node.isGroup
            ? childMaterials.map((m) => (
                <CatalogMaterialRow
                  key={`mat-${m.id}-${node.depth + 1}-${String(node.color)}`}
                  material={m}
                  depth={node.depth + 1}
                  categoryColor={node.color}
                  materialBadge={materialBadge}
                  canMutate={canMutate}
                  onPreview={onPreviewMaterial}
                  onEdit={onEditMaterial}
                  onDelete={onDeleteMaterial}
                />
              ))
            : null}
        </>
      ) : null}
    </Fragment>
  );
}
