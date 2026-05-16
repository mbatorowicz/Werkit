import { buildCategoryTree, type CategoryHierarchyRow, type CategoryTreeNode } from "@/lib/categoryTree";

export type CatalogMaterialRow = {
  id: number;
  name: string;
  categoryIds?: number[];
};

export type MaterialCatalogIndex<T extends CategoryHierarchyRow> = {
  byCategoryId: Map<number, CatalogMaterialRow[]>;
  uncategorized: CatalogMaterialRow[];
};

export function indexMaterialsByCategory<T extends CategoryHierarchyRow>(
  categories: T[],
  materials: CatalogMaterialRow[],
): MaterialCatalogIndex<T> {
  const leafIds = new Set(categories.filter((c) => !c.isGroup).map((c) => c.id));
  const byCategoryId = new Map<number, CatalogMaterialRow[]>();
  const uncategorized: CatalogMaterialRow[] = [];

  for (const material of materials) {
    const leafLinks = (material.categoryIds ?? []).filter((id) => leafIds.has(id));
    if (leafLinks.length === 0) {
      uncategorized.push(material);
      continue;
    }
    for (const categoryId of leafLinks) {
      const list = byCategoryId.get(categoryId) ?? [];
      list.push(material);
      byCategoryId.set(categoryId, list);
    }
  }

  for (const list of byCategoryId.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "pl"));
  }
  uncategorized.sort((a, b) => a.name.localeCompare(b.name, "pl"));

  return { byCategoryId, uncategorized };
}

export function buildMaterialCategoryTree<T extends CategoryHierarchyRow>(categories: T[]): CategoryTreeNode<T>[] {
  return buildCategoryTree(categories);
}

export function collectExpandableCategoryIds<T extends CategoryHierarchyRow>(
  roots: CategoryTreeNode<T>[],
  materialsByCategory: Map<number, CatalogMaterialRow[]>,
): number[] {
  const ids: number[] = [];
  const walk = (nodes: CategoryTreeNode<T>[]) => {
    for (const node of nodes) {
      const materialCount = materialsByCategory.get(node.id)?.length ?? 0;
      if (node.children.length > 0 || materialCount > 0) ids.push(node.id);
      walk(node.children);
    }
  };
  walk(roots);
  return ids;
}
