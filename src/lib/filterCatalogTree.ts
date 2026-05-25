import type { CategoryHierarchyRow, CategoryTreeNode } from "@/lib/categoryTree";
import type { CatalogMaterialRow, MaterialCatalogIndex } from "@/lib/materialCatalogTree";
import { matchesSearchQuery, normalizeSearchText } from "@/lib/searchComboboxFilter";

export function normalizeCatalogSearchQuery(query: string): string {
  return normalizeSearchText(query);
}

function nameMatches(name: string, rawQuery: string): boolean {
  return matchesSearchQuery(name, rawQuery);
}

function materialMatches(material: CatalogMaterialRow, rawQuery: string): boolean {
  return nameMatches(material.name, rawQuery);
}

function filterCategoryNodes<T extends CategoryHierarchyRow>(
  nodes: CategoryTreeNode<T>[],
  materialsByCategoryId: Map<number, CatalogMaterialRow[]>,
  rawQuery: string,
  expandIds: Set<number>,
): CategoryTreeNode<T>[] {
  const q = normalizeCatalogSearchQuery(rawQuery);
  const filtered: CategoryTreeNode<T>[] = [];

  for (const node of nodes) {
    const childNodes = filterCategoryNodes(node.children, materialsByCategoryId, rawQuery, expandIds);
    const materials = materialsByCategoryId.get(node.id) ?? [];
    const visibleMaterials = q ? materials.filter((m) => materialMatches(m, rawQuery)) : materials;
    const selfMatch = nameMatches(node.name, rawQuery);
    const branchMatch = selfMatch || childNodes.length > 0 || visibleMaterials.length > 0;

    if (!branchMatch) continue;

    if (q && (childNodes.length > 0 || visibleMaterials.length > 0)) {
      expandIds.add(node.id);
    }

    filtered.push({
      ...node,
      children: q ? childNodes : node.children,
    });
  }

  return filtered;
}

export type CatalogTreeFilterResult<T extends CategoryHierarchyRow> = {
  roots: CategoryTreeNode<T>[];
  materialsByCategoryId: Map<number, CatalogMaterialRow[]>;
  uncategorized: CatalogMaterialRow[];
  expandIds: Set<number>;
  hasQuery: boolean;
};

export function filterCatalogTree<T extends CategoryHierarchyRow>(
  roots: CategoryTreeNode<T>[],
  materialIndex: MaterialCatalogIndex,
  rawQuery: string,
): CatalogTreeFilterResult<T> {
  const q = normalizeCatalogSearchQuery(rawQuery);
  if (!q) {
    return {
      roots,
      materialsByCategoryId: materialIndex.byCategoryId,
      uncategorized: materialIndex.uncategorized,
      expandIds: new Set(),
      hasQuery: false,
    };
  }

  const expandIds = new Set<number>();
  const filteredRoots = filterCategoryNodes(roots, materialIndex.byCategoryId, rawQuery, expandIds);

  const materialsByCategoryId = new Map<number, CatalogMaterialRow[]>();
  const walk = (nodes: CategoryTreeNode<T>[]) => {
    for (const node of nodes) {
      if (!node.isGroup) {
        const list = (materialIndex.byCategoryId.get(node.id) ?? []).filter((m) => materialMatches(m, rawQuery));
        if (list.length > 0) materialsByCategoryId.set(node.id, list);
      }
      walk(node.children);
    }
  };
  walk(filteredRoots);

  const uncategorized = materialIndex.uncategorized.filter((m) => materialMatches(m, rawQuery));

  return {
    roots: filteredRoots,
    materialsByCategoryId,
    uncategorized,
    expandIds,
    hasQuery: true,
  };
}
