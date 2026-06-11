"use client";

import { useMemo, useState } from "react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { categorySharedLabels } from "@/lib/categoryI18n";
import { useDictionary } from "@/i18n";
import { filterCatalogTree } from "@/lib/filterCatalogTree";
import {
  buildMaterialCategoryTree,
  computeCategoryBranchStats,
  indexMaterialsByCategory,
  type CatalogMaterialRow,
} from "@/lib/materialCatalogTree";
import type { CategoryHierarchyRow } from "@/lib/categoryTree";
import { CatalogTreeHeader } from "./CatalogTreeHeader";
import { CatalogTreeNodeList } from "./CatalogTreeNodeList";
import CatalogMaterialRowComponent from "./CatalogMaterialRow";

const EMPTY_CATALOG_MATERIALS: CatalogMaterialRow[] = [];

function toggleExpandedSet(prev: Set<number>, id: number): Set<number> {
  if (!prev.has(id)) {
    const next = new Set(prev);
    next.add(id);
    return next;
  }
  if (prev.size === 1) return new Set<number>();
  const next = new Set(prev);
  next.delete(id);
  return next;
}

export type CatalogCategoryItem = CategoryHierarchyRow & {
  color?: string | null;
  isStationary?: boolean;
};

type Props<T extends CatalogCategoryItem> = {
  title: string;
  subtitle?: string;
  addCategoryLabel: string;
  addMaterialLabel?: string;
  emptyLabel: string;
  groupBadge: string;
  treeStatCategories?: string;
  treeStatCategoriesShort?: string;
  treeStatMaterials?: string;
  materialBadge?: string;
  uncategorizedTitle?: string;
  stationaryBadge?: string;
  searchPlaceholder?: string;
  searchNoResults?: string;
  categories: T[];
  materials?: CatalogMaterialRow[];
  isLoading: boolean;
  canMutate: boolean;
  onAddCategory: () => void;
  onAddMaterial?: () => void;
  onPreviewCategory?: (item: T) => void;
  onEditCategory: (item: T) => void;
  onDeleteCategory: (id: number) => void;
  onPreviewMaterial?: (material: CatalogMaterialRow) => void;
  onEditMaterial?: (material: CatalogMaterialRow) => void;
  onDeleteMaterial?: (id: number) => void;
};

export function ExpandableCatalogTree<T extends CatalogCategoryItem>({
  title,
  subtitle,
  addCategoryLabel,
  addMaterialLabel,
  emptyLabel,
  groupBadge,
  treeStatCategories,
  treeStatCategoriesShort,
  treeStatMaterials,
  materialBadge,
  uncategorizedTitle,
  stationaryBadge,
  searchPlaceholder,
  searchNoResults,
  categories,
  materials,
  isLoading,
  canMutate,
  onAddCategory,
  onAddMaterial,
  onPreviewCategory,
  onEditCategory,
  onDeleteCategory,
  onPreviewMaterial,
  onEditMaterial,
  onDeleteMaterial,
}: Props<T>) {
  const materialList = materials ?? EMPTY_CATALOG_MATERIALS;
  const roots = useMemo(() => buildMaterialCategoryTree(categories), [categories]);
  const materialIndex = useMemo(
    () => indexMaterialsByCategory(categories, materialList),
    [categories, materialList]
  );
  const branchStats = useMemo(
    () => computeCategoryBranchStats(roots, materialIndex.byCategoryId),
    [roots, materialIndex.byCategoryId]
  );
  const showMaterialStats = Boolean(treeStatMaterials);
  const catalogDict = categorySharedLabels(useDictionary(), "admin");
  const resolvedSearchPlaceholder = searchPlaceholder ?? catalogDict.catalogSearchPlaceholder;
  const resolvedSearchNoResults = searchNoResults ?? catalogDict.catalogSearchNoResults;

  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(
    () => filterCatalogTree(roots, materialIndex, searchQuery),
    [roots, materialIndex, searchQuery]
  );

  const displayRoots = filtered.roots;
  const displayMaterialIndex = filtered.materialsByCategoryId;
  const displayUncategorized = filtered.uncategorized;

  const toggleExpanded = (id: number) => setExpanded((prev) => toggleExpandedSet(prev, id));

  const hasContent =
    categories.length > 0 ||
    materialIndex.uncategorized.length > 0 ||
    (isLoading && categories.length === 0);

  const hasFilteredContent = displayRoots.length > 0 || displayUncategorized.length > 0;

  const isNodeExpanded = (id: number) =>
    filtered.hasQuery ? filtered.expandIds.has(id) : expanded.has(id);

  const renderCategoryNodes = (nodes: typeof displayRoots): React.ReactNode => (
    <CatalogTreeNodeList
      nodes={nodes}
      displayMaterialIndex={displayMaterialIndex}
      branchStats={branchStats}
      isNodeExpanded={isNodeExpanded}
      showMaterialStats={showMaterialStats}
      treeStatCategories={treeStatCategories}
      treeStatCategoriesShort={treeStatCategoriesShort}
      treeStatMaterials={treeStatMaterials}
      groupBadge={groupBadge}
      stationaryBadge={stationaryBadge}
      materialBadge={materialBadge}
      canMutate={canMutate}
      onToggle={toggleExpanded}
      onPreviewCategory={onPreviewCategory}
      onEditCategory={onEditCategory}
      onDeleteCategory={onDeleteCategory}
      onPreviewMaterial={onPreviewMaterial}
      onEditMaterial={onEditMaterial}
      onDeleteMaterial={onDeleteMaterial}
    />
  );

  return (
    <>
      <CatalogTreeHeader
        title={title}
        subtitle={subtitle}
        addCategoryLabel={addCategoryLabel}
        addMaterialLabel={addMaterialLabel}
        canMutate={canMutate}
        onAddCategory={onAddCategory}
        onAddMaterial={onAddMaterial}
      />

      <ListSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={resolvedSearchPlaceholder}
      />

      <div className="mb-10 space-y-1">
        {renderCategoryNodes(displayRoots)}
        {displayUncategorized.length > 0 ? (
          <>
            {uncategorizedTitle ? (
              <p
                className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-500"
                style={{ marginLeft: 0 }}
              >
                {uncategorizedTitle}
              </p>
            ) : null}
            {displayUncategorized.map((m) => (
              <CatalogMaterialRowComponent
                key={`mat-${m.id}-0-`}
                material={m}
                depth={0}
                materialBadge={materialBadge}
                canMutate={canMutate}
                onPreview={onPreviewMaterial}
                onEdit={onEditMaterial}
                onDelete={onDeleteMaterial}
              />
            ))}
          </>
        ) : null}
        {!isLoading && hasContent && filtered.hasQuery && !hasFilteredContent ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700/50 dark:bg-zinc-900/50 dark:text-zinc-400">
            {resolvedSearchNoResults}
          </div>
        ) : null}
        {!isLoading && !hasContent ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700/50 dark:bg-zinc-900/50 dark:text-zinc-400">
            {emptyLabel}
          </div>
        ) : null}
      </div>
    </>
  );
}
