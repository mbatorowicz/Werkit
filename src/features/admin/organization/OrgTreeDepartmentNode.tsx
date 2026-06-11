"use client";

import { Building2, ChevronRight, Edit2, Plus, Trash2 } from "lucide-react";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import type { DepartmentTreeNode } from "@/types/organization";
import type { OrgTreeLabels } from "./OrgHierarchyTree";
import { OrgTreeTeamNode } from "./OrgTreeTeamNode";
import { expandKey, ORG_TREE_ROW_CLASS } from "./orgTreeUi";

interface OrgTreeDepartmentNodeProps {
  dept: DepartmentTreeNode;
  depth: number;
  expanded: Set<string>;
  searchQuery: string;
  canMutate: boolean;
  labels: OrgTreeLabels;
  onToggle: (key: string) => void;
  onAddTeam: (departmentId: number) => void;
  onEditDepartment: (dept: DepartmentTreeNode) => void;
  onDeleteDepartment: (dept: DepartmentTreeNode) => void;
  onAddMember: (teamId: number) => void;
  onEditTeam: (team: DepartmentTreeNode["teams"][number]) => void;
  onDeleteTeam: (team: DepartmentTreeNode["teams"][number]) => void;
  onDeleteMember: (memberId: number) => void;
  onOpenUser: (userId: number) => void;
}

export function OrgTreeDepartmentNode(props: OrgTreeDepartmentNodeProps) {
  const {
    dept,
    depth,
    expanded,
    searchQuery,
    canMutate,
    labels,
    onToggle,
    onAddTeam,
    onEditDepartment,
    onDeleteDepartment,
    onAddMember,
    onEditTeam,
    onDeleteTeam,
    onDeleteMember,
    onOpenUser,
  } = props;

  const deptKey = expandKey("dept", dept.id);
  const hasNested = dept.children.length > 0 || dept.teams.length > 0;
  const isExpanded = expanded.has(deptKey) || searchQuery.trim() !== "";

  return (
    <div className="space-y-1">
      <div className={ORG_TREE_ROW_CLASS} style={{ marginLeft: `${depth * 1.25}rem` }}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {hasNested ? (
            <button
              type="button"
              onClick={() => onToggle(deptKey)}
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
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-200">{dept.name}</span>
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
          {dept.teams.map((team) => (
            <OrgTreeTeamNode
              key={expandKey("team", team.id)}
              team={team}
              depth={depth}
              expanded={expanded}
              searchQuery={searchQuery}
              canMutate={canMutate}
              labels={labels}
              onToggle={onToggle}
              onAddMember={onAddMember}
              onEditTeam={onEditTeam}
              onDeleteTeam={onDeleteTeam}
              onDeleteMember={onDeleteMember}
              onOpenUser={onOpenUser}
            />
          ))}
          {dept.children.map((child) => (
            <OrgTreeDepartmentNode
              key={expandKey("dept", child.id)}
              {...props}
              dept={child}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
