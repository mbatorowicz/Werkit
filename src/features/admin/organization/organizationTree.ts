import type { OrganizationDepartmentRow } from "@/lib/narrow/organization";

export type DepartmentTreeEntry = OrganizationDepartmentRow & { depth: number };

/** Płaska lista departamentów w kolejności drzewa (parent → children). */
export function flattenDepartmentTree(departments: OrganizationDepartmentRow[]): DepartmentTreeEntry[] {
  const byParent = new Map<number | null, OrganizationDepartmentRow[]>();
  for (const dept of departments) {
    const key = dept.parentId;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(dept);
    else byParent.set(key, [dept]);
  }

  const out: DepartmentTreeEntry[] = [];

  function walk(parentId: number | null, depth: number) {
    const nodes = byParent.get(parentId) ?? [];
    for (const node of nodes) {
      out.push({ ...node, depth });
      walk(node.id, depth + 1);
    }
  }

  walk(null, 0);
  return out;
}
