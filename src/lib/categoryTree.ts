/** Wspólne pola hierarchii grup (zlecenia / materiały). */
export type CategoryHierarchyRow = {
  id: number;
  name: string;
  parentId: number | null;
  isGroup: boolean;
  sortOrder: number;
};

export type CategoryTreeNode<T extends CategoryHierarchyRow> = T & {
  children: CategoryTreeNode<T>[];
  depth: number;
};

export function sortCategoriesForDisplay<T extends CategoryHierarchyRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const so = a.sortOrder - b.sortOrder;
    if (so !== 0) return so;
    return a.name.localeCompare(b.name, "pl");
  });
}

export function filterCategoryLeaves<T extends CategoryHierarchyRow>(rows: T[]): T[] {
  return rows.filter((r) => !r.isGroup);
}

/** Tylko węzły oznaczone jako grupy (do selecta „rodzic”). */
export function filterCategoryGroups<T extends CategoryHierarchyRow>(rows: T[]): T[] {
  return rows.filter((r) => r.isGroup);
}

export function buildCategoryTree<T extends CategoryHierarchyRow>(rows: T[]): CategoryTreeNode<T>[] {
  const sorted = sortCategoriesForDisplay(rows);
  const byId = new Map<number, CategoryTreeNode<T>>();
  for (const row of sorted) {
    byId.set(row.id, { ...row, children: [], depth: 0 });
  }
  const roots: CategoryTreeNode<T>[] = [];
  for (const node of byId.values()) {
    const pid = node.parentId;
    if (pid != null && byId.has(pid)) {
      const parent = byId.get(pid)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortNodes = (list: CategoryTreeNode<T>[]) => {
    list.sort((a, b) => {
      const so = a.sortOrder - b.sortOrder;
      if (so !== 0) return so;
      return a.name.localeCompare(b.name, "pl");
    });
    for (const n of list) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

export function flattenCategoryTree<T extends CategoryHierarchyRow>(roots: CategoryTreeNode<T>[]): CategoryTreeNode<T>[] {
  const out: CategoryTreeNode<T>[] = [];
  const walk = (nodes: CategoryTreeNode<T>[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}

/** Czy `nodeId` występuje w poddrzewie `ancestorId`. */
export function isDescendantOf<T extends CategoryHierarchyRow>(
  rows: T[],
  nodeId: number,
  ancestorId: number,
): boolean {
  const byId = new Map(rows.map((r) => [r.id, r]));
  let cur: number | null = nodeId;
  const seen = new Set<number>();
  while (cur != null && !seen.has(cur)) {
    if (cur === ancestorId) return true;
    seen.add(cur);
    cur = byId.get(cur)?.parentId ?? null;
  }
  return false;
}
