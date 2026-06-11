"use client";

import { ChevronRight, User, UserPlus } from "lucide-react";
import type { OrgTreeLabels } from "./OrgHierarchyTree";
import { expandKey, ORG_TREE_ROW_CLASS } from "./orgTreeUi";

interface OrgTreeUnassignedSectionProps {
  filteredUnassigned: { id: number; fullName: string; role: string }[];
  expanded: Set<string>;
  searchQuery: string;
  labels: OrgTreeLabels;
  onToggle: (key: string) => void;
  onOpenUser: (userId: number) => void;
}

export function OrgTreeUnassignedSection({
  filteredUnassigned,
  expanded,
  searchQuery,
  labels,
  onToggle,
  onOpenUser,
}: OrgTreeUnassignedSectionProps) {
  const unassignedKey = expandKey("unassigned", 0);
  const unassignedExpanded = expanded.has(unassignedKey) || searchQuery.trim() !== "";

  return (
    <div className="space-y-1 pt-2">
      <div className={ORG_TREE_ROW_CLASS}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            onClick={() => onToggle(unassignedKey)}
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
          <p className="px-3 py-2 text-sm text-zinc-500" style={{ marginLeft: "1.25rem" }}>
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
              className={`${ORG_TREE_ROW_CLASS} cursor-pointer`}
              style={{ marginLeft: "1.25rem" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 shrink-0" />
                <User className="h-4 w-4 text-zinc-500" />
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{u.fullName}</span>
              </div>
            </div>
          ))
        )
      ) : null}
    </div>
  );
}
