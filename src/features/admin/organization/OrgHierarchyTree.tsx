"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronRight, Edit2, Plus, Trash2, User, UserPlus, Users } from "lucide-react";
import { ListSearchBar } from "@/components/ListSearchBar";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import { BTN_PRIMARY_COMPACT_SM } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";
import { INLINE_SCROLL_PANEL_CLASS, touchScrollStyle } from "@/components/scrollPanelStyles";
import type { DepartmentTreeNode } from "@/types/organization";

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

function expandKey(kind: "dept" | "team" | "unassigned", id: number) {
  return `${kind}-${id}`;
}

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

  const rowClass =
    "group flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900";

  const renderDepartment = (dept: DepartmentTreeNode, depth: number) => {
    const deptKey = expandKey("dept", dept.id);
    const hasNested = dept.children.length > 0 || dept.teams.length > 0;
    const isExpanded = expanded.has(deptKey) || searchQuery.trim() !== "";

    return (
      <div key={deptKey} className="space-y-1">
        <div className={rowClass} style={{ marginLeft: `${depth * 1.25}rem` }}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {hasNested ? (
              <button
                type="button"
                onClick={() => toggle(deptKey)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-expanded={isExpanded}
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              </button>
            ) : (
              <span className="w-5 shrink-0" />
            )}
            <Building2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span className="truncate font-medium text-zinc-900 dark:text-zinc-200">
              {dept.name}
            </span>
            <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
              {labels.deptBadge}
            </span>
          </div>
          {canMutate ? (
            <div className="flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  stopRowActionClick(e);
                  onAddTeam(dept.id);
                }}
                className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                title={labels.addTeam}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  stopRowActionClick(e);
                  onEditDepartment(dept);
                }}
                className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  stopRowActionClick(e);
                  onDeleteDepartment(dept);
                }}
                className="rounded p-1 text-zinc-400 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </div>

        {isExpanded ? (
          <div className="space-y-1">
            {dept.teams.map((team) => {
              const teamKey = expandKey("team", team.id);
              const teamExpanded = expanded.has(teamKey) || searchQuery.trim() !== "";
              const hasMembers = team.members.length > 0;
              return (
                <div key={teamKey} className="space-y-1">
                  <div className={rowClass} style={{ marginLeft: `${(depth + 1) * 1.25}rem` }}>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      {hasMembers ? (
                        <button
                          type="button"
                          onClick={() => toggle(teamKey)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          aria-expanded={teamExpanded}
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${teamExpanded ? "rotate-90" : ""}`}
                          />
                        </button>
                      ) : (
                        <span className="w-5 shrink-0" />
                      )}
                      <Users className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                      <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                        {team.name}
                      </span>
                      <span className="shrink-0 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                        {labels.teamBadge}
                      </span>
                    </div>
                    {canMutate ? (
                      <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            stopRowActionClick(e);
                            onAddMember(team.id);
                          }}
                          className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                          title={labels.addMember}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            stopRowActionClick(e);
                            onEditTeam(team);
                          }}
                          className="rounded p-1 text-zinc-400 hover:text-zinc-700"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            stopRowActionClick(e);
                            onDeleteTeam(team);
                          }}
                          className="rounded p-1 text-zinc-400 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {teamExpanded
                    ? team.members.map((member) => (
                        <div
                          key={`member-${member.id}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => onOpenUser(member.userId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onOpenUser(member.userId);
                            }
                          }}
                          className={`${rowClass} cursor-pointer`}
                          style={{ marginLeft: `${(depth + 2) * 1.25}rem` }}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="w-5 shrink-0" />
                            <User className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                                {member.user.fullName}
                              </p>
                              <p className="truncate text-xs text-zinc-500">
                                {member.role === "leader" ? labels.roleLeader : labels.roleMember}
                              </p>
                            </div>
                          </div>
                          {canMutate ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                stopRowActionClick(e);
                                onDeleteMember(member.id);
                              }}
                              className="rounded p-1 text-zinc-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </div>
                      ))
                    : null}
                </div>
              );
            })}
            {dept.children.map((child) => renderDepartment(child, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const unassignedKey = expandKey("unassigned", 0);
  const unassignedExpanded = expanded.has(unassignedKey) || searchQuery.trim() !== "";

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
            {filteredTree.map((dept) => renderDepartment(dept, 0))}

            {unassignedUsers.length > 0 || canManageAccounts ? (
              <div className="space-y-1 pt-2">
                <div className={rowClass}>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(unassignedKey)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      aria-expanded={unassignedExpanded}
                    >
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${unassignedExpanded ? "rotate-90" : ""}`}
                      />
                    </button>
                    <UserPlus className="h-4 w-4 shrink-0 text-amber-600" />
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                      {labels.unassignedTitle}
                    </span>
                  </div>
                </div>
                {unassignedExpanded ? (
                  filteredUnassigned.length === 0 ? (
                    <p
                      className="px-3 py-2 text-sm text-zinc-500"
                      style={{ marginLeft: "1.25rem" }}
                    >
                      {labels.unassignedEmpty}
                    </p>
                  ) : (
                    filteredUnassigned.map((u) => (
                      <div
                        key={`unassigned-${u.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenUser(u.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onOpenUser(u.id);
                          }
                        }}
                        className={`${rowClass} cursor-pointer`}
                        style={{ marginLeft: "1.25rem" }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 shrink-0" />
                          <User className="h-4 w-4 text-zinc-500" />
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {u.fullName}
                          </span>
                        </div>
                      </div>
                    ))
                  )
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
