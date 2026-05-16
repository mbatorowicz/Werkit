import type { CategoryHierarchyRow, CategoryTreeNode } from "@/lib/categoryTree";
import type { CatalogMaterialRow, MaterialCatalogIndex } from "@/lib/materialCatalogTree";

export function normalizeCatalogSearchQuery(query: string): string {
  return query.trim().toLocaleLowerCase("pl");
}

function nameMatches(name: string, q: string): boolean {
  return name.toLocaleLowerCase("pl").includes(q);
}

function materialMatches(material: CatalogMaterialRow, q: string): boolean {
  return nameMatches(material.name, q);
}

function filterCategoryNodes<T extends CategoryHierarchyRow>(
  nodes: CategoryTreeNode<T>[],
  materialsByCategoryId: Map<number, CatalogMaterialRow[]>,
  q: string,
  expandIds: Set<number>,
): CategoryTreeNode<T>[] {
  const filtered: CategoryTreeNode<T>[] = [];

  for (const node of nodes) {
    const childNodes = filterCategoryNodes(node.children, materialsByCategoryId, q, expandIds);
    const materials = materialsByCategoryId.get(node.id) ?? [];
    const visibleMaterials = q ? materials.filter((m) => materialMatches(m, q)) : materials;
    const selfMatch = nameMatches(node.name, q);
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
  materialIndex: MaterialCatalogIndex<T>,
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
  const filteredRoots = filterCategoryNodes(roots, materialIndex.byCategoryId, q, expandIds);

  const materialsByCategoryId = new Map<number, CatalogMaterialRow[]>();
  const walk = (nodes: CategoryTreeNode<T>[]) => {
    for (const node of nodes) {
      if (!node.isGroup) {
        const list = (materialIndex.byCategoryId.get(node.id) ?? []).filter((m) => materialMatches(m, q));
        if (list.length > 0) materialsByCategoryId.set(node.id, list);
      }
      walk(node.children);
    }
  };
  walk(filteredRoots);

  const uncategorized = materialIndex.uncategorized.filter((m) => materialMatches(m, q));

  return {
    roots: filteredRoots,
    materialsByCategoryId,
    uncategorized,
    expandIds,
    hasQuery: true,
  };
}
