"use client";

import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { NavigationInstruction } from "./useOsrmNavigation";
import { ManeuverIcon } from "./ManeuverIcon";
import { formatNavigationDistance, formatNavigationDuration } from "./navigationFormat";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NavigationBottomSheetProps {
  instructions: NavigationInstruction[];
  currentInstructionIndex: number;
  remainingDistance: number;
  remainingDuration: number;
  destinationName?: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A bottom sheet / drawer that shows the full list of turn-by-turn instructions.
 * Slides up from the bottom of the map, similar to Google Maps route overview.
 *
 * On mobile, uses `max-h-[70vh]` and `pb-safe` (via pb-6) to avoid system nav bar overlap.
 */
export default function NavigationBottomSheet({
  instructions,
  currentInstructionIndex,
  remainingDistance,
  remainingDuration,
  destinationName,
  onClose,
}: NavigationBottomSheetProps) {
  const [expanded, setExpanded] = useState(false);

  if (instructions.length === 0) return null;

  const visibleInstructions = expanded ? instructions : instructions.slice(0, 5);
  const hasMore = instructions.length > 5 && !expanded;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white dark:bg-zinc-900 rounded-t-2xl shadow-2xl border-t border-zinc-200 dark:border-zinc-700 max-h-[70vh] flex flex-col pb-6">
      {/* Handle bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-700/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-1.5 bg-zinc-300 dark:bg-zinc-600 rounded-full mx-auto" />
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {formatNavigationDistance(remainingDistance)}
          </span>
          <span>·</span>
          <span>{formatNavigationDuration(remainingDuration)}</span>
          {destinationName && (
            <>
              <span>·</span>
              <span className="truncate max-w-[100px]">{destinationName}</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          <X className="h-4 w-4 text-zinc-500" />
        </button>
      </div>

      {/* Instruction list */}
      <div className="overflow-y-auto flex-1 px-4 py-2">
        {visibleInstructions.map((inst, idx) => {
          const isCurrent = idx === currentInstructionIndex;
          const isPast = idx < currentInstructionIndex;
          const isArrive = inst.type === "arrive";

          return (
            <div
              key={`nav-step-${idx}`}
              className={`flex items-start gap-3 py-2.5 border-l-2 pl-4 relative ${
                isCurrent
                  ? "border-blue-500 dark:border-blue-400"
                  : isPast
                    ? "border-zinc-200 dark:border-zinc-700"
                    : "border-zinc-200 dark:border-zinc-700"
              } ${idx === visibleInstructions.length - 1 ? "border-l-2" : ""}`}
            >
              {/* Timeline dot */}
              <div
                className={`absolute -left-[9px] top-3 w-4 h-4 rounded-full border-2 ${
                  isCurrent
                    ? "bg-blue-500 border-blue-500 dark:bg-blue-400 dark:border-blue-400"
                    : isPast
                      ? "bg-zinc-300 dark:bg-zinc-600 border-zinc-300 dark:border-zinc-600"
                      : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600"
                }`}
              />

              {/* Icon */}
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                  isArrive
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                    : isCurrent
                      ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-300 dark:ring-blue-700"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <ManeuverIcon type={inst.type} modifier={inst.modifier} className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isCurrent
                      ? "text-blue-700 dark:text-blue-300"
                      : isPast
                        ? "text-zinc-400 dark:text-zinc-500"
                        : "text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {inst.text}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {formatNavigationDistance(inst.distanceMeters)}
                  {inst.streetName ? ` · ${inst.streetName}` : ""}
                </p>
              </div>
            </div>
          );
        })}

        {/* Show more button */}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition mt-1"
          >
            <ChevronDown className="h-4 w-4" />
            Show all {instructions.length} instructions
          </button>
        )}
      </div>
    </div>
  );
}
