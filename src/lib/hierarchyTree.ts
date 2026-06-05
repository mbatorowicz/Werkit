/** SSOT budowania drzew parentId — wspólne dla kategorii, materiałów i organizacji. */

export type HierarchyRow = {
  id: number;
  name: string;
  parentId: number | null;
  sortOrder?: number;
};

export type HierarchyTreeNode<T extends HierarchyRow> = T & {
  children: HierarchyTreeNode<T>[];
  depth: number;
};

export function sortHierarchyRows<T extends HierarchyRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (so !== 0) return so;
    return a.name.localeCompare(b.name, "pl");
  });
}

export function buildHierarchyTree<T extends HierarchyRow>(rows: T[]): HierarchyTreeNode<T>[] {
  const sorted = sortHierarchyRows(rows);
  const byId = new Map<number, HierarchyTreeNode<T>>();
  for (const row of sorted) {
    byId.set(row.id, { ...row, children: [], depth: 0 });
  }
  const roots: HierarchyTreeNode<T>[] = [];
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
  const sortNodes = (list: HierarchyTreeNode<T>[]) => {
    list.sort((a, b) => {
      const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (so !== 0) return so;
      return a.name.localeCompare(b.name, "pl");
    });
    for (const n of list) sortNodes(n.children);
  };
  sortNodes(roots);
  return roots;
}

export function flattenHierarchyTree<T extends HierarchyRow>(
  roots: HierarchyTreeNode<T>[]
): HierarchyTreeNode<T>[] {
  const out: HierarchyTreeNode<T>[] = [];
  const walk = (nodes: HierarchyTreeNode<T>[]) => {
    for (const n of nodes) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(roots);
  return out;
}
