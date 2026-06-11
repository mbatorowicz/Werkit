"use client";

import { ChevronRight, Edit2, Plus, Trash2, User, Users } from "lucide-react";
import { stopRowActionClick } from "@/lib/stopRowActionClick";
import type { DepartmentTreeNode } from "@/types/organization";
import type { OrgTreeLabels } from "./OrgHierarchyTree";
import { expandKey, ORG_TREE_ROW_CLASS } from "./orgTreeUi";

interface OrgTreeTeamNodeProps {
  team: DepartmentTreeNode["teams"][number];
  depth: number;
  expanded: Set<string>;
  searchQuery: string;
  canMutate: boolean;
  labels: OrgTreeLabels;
  onToggle: (key: string) => void;
  onAddMember: (teamId: number) => void;
  onEditTeam: (team: DepartmentTreeNode["teams"][number]) => void;
  onDeleteTeam: (team: DepartmentTreeNode["teams"][number]) => void;
  onDeleteMember: (memberId: number) => void;
  onOpenUser: (userId: number) => void;
}

export function OrgTreeTeamNode({
  team,
  depth,
  expanded,
  searchQuery,
  canMutate,
  labels,
  onToggle,
  onAddMember,
  onEditTeam,
  onDeleteTeam,
  onDeleteMember,
  onOpenUser,
}: OrgTreeTeamNodeProps) {
  const teamKey = expandKey("team", team.id);
  const teamExpanded = expanded.has(teamKey) || searchQuery.trim() !== "";
  const hasMembers = team.members.length > 0;

  return (
    <div className="space-y-1">
      <div className={ORG_TREE_ROW_CLASS} style={{ marginLeft: `${(depth + 1) * 1.25}rem` }}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {hasMembers ? (
            <button
              type="button"
              onClick={() => onToggle(teamKey)}
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
          <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">{team.name}</span>
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
              className={`${ORG_TREE_ROW_CLASS} cursor-pointer`}
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
}
