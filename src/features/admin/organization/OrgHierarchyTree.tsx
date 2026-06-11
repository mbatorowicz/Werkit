"use client";

import { useMemo, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { BTN_PRIMARY_COMPACT_SM } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { INLINE_SCROLL_PANEL_CLASS, touchScrollStyle } from "@/components/scrollPanelStyles";
import type { DepartmentTreeNode } from "@/types/organization";
import { OrgTreeDepartmentNode } from "./OrgTreeDepartmentNode";
import { OrgTreeUnassignedSection } from "./OrgTreeUnassignedSection";
import { expandKey } from "./orgTreeUi";

export type OrgTreeLabels = {
  searchPlaceholder: string;
  searchNoResults: string;
  emptyTree: string;
  unassignedTitle: string;
  unassignedEmpty: string;
  addDepartment: string;
  addTeam: string;
  addMember: string;
  addAccount: string;
  roleLeader: string;
  roleMember: string;
  deptBadge: string;
  teamBadge: string;
};

type Props = {
  tree: DepartmentTreeNode[];
  unassignedUsers: { id: number; fullName: string; role: string }[];
  isLoading: boolean;
  canMutate: boolean;
  canManageAccounts: boolean;
  labels: OrgTreeLabels;
  onAddDepartment: (parentId: number | null) => void;
  onEditDepartment: (dept: DepartmentTreeNode) => void;
  onDeleteDepartment: (dept: DepartmentTreeNode) => void;
  onAddTeam: (departmentId: number) => void;
  onEditTeam: (team: DepartmentTreeNode["teams"][number]) => void;
  onDeleteTeam: (team: DepartmentTreeNode["teams"][number]) => void;
  onAddMember: (teamId: number) => void;
  onDeleteMember: (memberId: number) => void;
  onOpenUser: (userId: number) => void;
  onAddAccount: () => void;
};

function deptMatchesSearch(node: DepartmentTreeNode, query: string): boolean {
  if (matchesSearchQuery(node.name, query)) return true;
  for (const team of node.teams) {
    if (matchesSearchQuery(team.name, query)) return true;
    for (const m of team.members) {
      if (matchesSearchQuery(`${m.user.fullName} ${m.user.usernameEmail}`, query)) return true;
    }
  }
  for (const child of node.children) {
    if (deptMatchesSearch(child, query)) return true;
  }
  return false;
}

export function OrgHierarchyTree({
  tree,
  unassignedUsers,
  isLoading,
  canMutate,
  canManageAccounts,
  labels,
  onAddDepartment,
  onEditDepartment,
  onDeleteDepartment,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onAddMember,
  onDeleteMember,
  onOpenUser,
  onAddAccount,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTree = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return tree;
    return tree.filter((n) => deptMatchesSearch(n, q));
  }, [tree, searchQuery]);

  const filteredUnassigned = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return unassignedUsers;
    return unassignedUsers.filter((u) => matchesSearchQuery(u.fullName, q));
  }, [unassignedUsers, searchQuery]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ListSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={labels.searchPlaceholder}
          className="sm:max-w-md"
        />
        <div className="flex flex-wrap gap-2">
          {canMutate ? (
            <button
              type="button"
              onClick={() => onAddDepartment(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <Plus className="h-4 w-4" />
              {labels.addDepartment}
            </button>
          ) : null}
          {canManageAccounts ? (
            <button
              type="button"
              onClick={onAddAccount}
              className={cn("inline-flex items-center gap-1.5", BTN_PRIMARY_COMPACT_SM)}
            >
              <UserPlus className="h-4 w-4" />
              {labels.addAccount}
            </button>
          ) : null}
        </div>
      </div>

      <div
        className={`${INLINE_SCROLL_PANEL_CLASS} rounded-xl border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/30`}
        style={touchScrollStyle(520)}
      >
        {isLoading ? (
          <p className="px-2 py-6 text-sm text-zinc-500">…</p>
        ) : filteredTree.length === 0 && filteredUnassigned.length === 0 ? (
          <p className="px-2 py-6 text-sm text-zinc-500">
            {searchQuery.trim() ? labels.searchNoResults : labels.emptyTree}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredTree.map((dept) => (
              <OrgTreeDepartmentNode
                key={expandKey("dept", dept.id)}
                dept={dept}
                depth={0}
                expanded={expanded}
                searchQuery={searchQuery}
                canMutate={canMutate}
                labels={labels}
                onToggle={toggle}
                onAddTeam={onAddTeam}
                onEditDepartment={onEditDepartment}
                onDeleteDepartment={onDeleteDepartment}
                onAddMember={onAddMember}
                onEditTeam={onEditTeam}
                onDeleteTeam={onDeleteTeam}
                onDeleteMember={onDeleteMember}
                onOpenUser={onOpenUser}
              />
            ))}

            {unassignedUsers.length > 0 || canManageAccounts ? (
              <OrgTreeUnassignedSection
                filteredUnassigned={filteredUnassigned}
                expanded={expanded}
                searchQuery={searchQuery}
                labels={labels}
                onToggle={toggle}
                onOpenUser={onOpenUser}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
