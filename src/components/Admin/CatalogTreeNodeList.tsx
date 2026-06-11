"use client";

import { formatDict } from "@/i18n/format";
import type { CategoryBranchStats, CatalogMaterialRow } from "@/lib/materialCatalogTree";
import type { CategoryTreeNode } from "@/lib/categoryTree";
import CatalogTreeNodeComponent from "./CatalogTreeNode";
import type { CatalogCategoryItem } from "./ExpandableCatalogTree";

interface CatalogNodeStatOptions {
  showMaterialStats: boolean;
  treeStatCategories?: string;
  treeStatCategoriesShort?: string;
  treeStatMaterials?: string;
}

function catalogNodeStats<T extends CatalogCategoryItem>(
  node: CategoryTreeNode<T>,
  stats: CategoryBranchStats | undefined,
  opts: CatalogNodeStatOptions
) {
  const isBranch = node.isGroup || (node.children?.length ?? 0) > 0;
  const categoryCount = stats?.descendantCategoryCount ?? 0;
  const categoryStatLong =
    stats && opts.treeStatCategories && isBranch && categoryCount > 0
      ? formatDict(opts.treeStatCategories, { count: categoryCount })
      : null;
  const categoryStatShort =
    stats && opts.treeStatCategoriesShort && isBranch && categoryCount > 0
      ? formatDict(opts.treeStatCategoriesShort, { count: categoryCount })
      : null;
  const materialCount = stats
    ? isBranch
      ? stats.descendantMaterialCount
      : stats.directMaterialCount
    : 0;
  const materialStat =
    opts.showMaterialStats && opts.treeStatMaterials
      ? formatDict(opts.treeStatMaterials, { count: materialCount })
      : null;

  return { categoryStatLong, categoryStatShort, materialStat, materialCount };
}

export interface CatalogTreeNodeListProps<T extends CatalogCategoryItem> {
  nodes: CategoryTreeNode<T>[];
  displayMaterialIndex: Map<number, CatalogMaterialRow[]>;
  branchStats: Map<number, CategoryBranchStats>;
  isNodeExpanded: (id: number) => boolean;
  showMaterialStats: boolean;
  treeStatCategories?: string;
  treeStatCategoriesShort?: string;
  treeStatMaterials?: string;
  groupBadge: string;
  stationaryBadge?: string;
  materialBadge?: string;
  canMutate: boolean;
  onToggle: (id: number) => void;
  onPreviewCategory?: (item: T) => void;
  onEditCategory: (item: T) => void;
  onDeleteCategory: (id: number) => void;
  onPreviewMaterial?: (material: CatalogMaterialRow) => void;
  onEditMaterial?: (material: CatalogMaterialRow) => void;
  onDeleteMaterial?: (id: number) => void;
}

export function CatalogTreeNodeList<T extends CatalogCategoryItem>(
  props: CatalogTreeNodeListProps<T>
): React.ReactNode {
  const {
    nodes,
    displayMaterialIndex,
    branchStats,
    isNodeExpanded,
    showMaterialStats,
    treeStatCategories,
    treeStatCategoriesShort,
    treeStatMaterials,
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
  } = props;

  return nodes.map((node) => {
    const childMaterials = displayMaterialIndex.get(node.id) ?? [];
    const isExpanded = isNodeExpanded(node.id);
    const { categoryStatLong, categoryStatShort, materialStat, materialCount } = catalogNodeStats(
      node,
      branchStats.get(node.id),
      { showMaterialStats, treeStatCategories, treeStatCategoriesShort, treeStatMaterials }
    );

    return (
      <CatalogTreeNodeComponent
        key={`cat-${node.id}`}
        node={node}
        childMaterials={childMaterials}
        isExpanded={isExpanded}
        categoryStatLong={categoryStatLong}
        categoryStatShort={categoryStatShort}
        materialStat={materialStat}
        materialCount={materialCount}
        groupBadge={groupBadge}
        stationaryBadge={stationaryBadge}
        materialBadge={materialBadge}
        canMutate={canMutate}
        onToggle={onToggle}
        onPreviewCategory={onPreviewCategory}
        onEditCategory={onEditCategory}
        onDeleteCategory={onDeleteCategory}
        onPreviewMaterial={onPreviewMaterial}
        onEditMaterial={onEditMaterial}
        onDeleteMaterial={onDeleteMaterial}
        renderChildren={() => <CatalogTreeNodeList {...props} nodes={node.children} />}
      />
    );
  });
}
