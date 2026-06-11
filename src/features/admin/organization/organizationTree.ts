import {
  buildHierarchyTree,
  flattenHierarchyTree,
  type HierarchyTreeNode,
} from "@/lib/hierarchyTree";
import type { OrganizationDepartmentRow } from "@/lib/narrow/organization";

export type DepartmentTreeEntry = OrganizationDepartmentRow & { depth: number };

/** Drzewo departamentów (SSOT: `hierarchyTree`). */
export function buildDepartmentTree(
  departments: OrganizationDepartmentRow[]
): HierarchyTreeNode<OrganizationDepartmentRow>[] {
  return buildHierarchyTree(departments);
}

/** Płaska lista departamentów w kolejności drzewa. */
export function flattenDepartmentTree(
  departments: OrganizationDepartmentRow[]
): DepartmentTreeEntry[] {
  return flattenHierarchyTree(buildDepartmentTree(departments));
}
