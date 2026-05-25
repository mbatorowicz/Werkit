"use client";

import type { NavigationInstruction } from "./useOsrmNavigation";
import { ManeuverIcon } from "./ManeuverIcon";
import { formatNavigationDistance, formatNavigationDuration } from "./navigationFormat";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NavigationInstructionBarProps {
  /** Current active instruction. */
  currentInstruction: NavigationInstruction | null;
  /** Next instruction (for preview). */
  nextInstruction: NavigationInstruction | null;
  /** Remaining distance to the current instruction in meters. */
  remainingToNextInstruction: number;
  /** Total remaining distance to destination in meters. */
  remainingDistance: number;
  /** Total remaining duration to destination in seconds. */
  remainingDuration: number;
  /** Whether navigation data is loading. */
  loading: boolean;
  /** Error message. */
  error: string | null;
  /** Destination name (optional). */
  destinationName?: string;
  /** Called when user taps to see full route overview. */
  onExpand?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A navigation instruction bar displayed at the top of the map during active navigation.
 * Shows the current maneuver, distance to next turn, and remaining trip info.
 * Styled like Google Maps driving navigation.
 */
export default function NavigationInstructionBar({
  currentInstruction,
  nextInstruction,
  remainingToNextInstruction,
  remainingDistance,
  remainingDuration,
  loading,
  error,
  destinationName,
  onExpand,
}: NavigationInstructionBarProps) {
  if (loading) {
    return (
      <div className="absolute top-4 left-4 right-4 z-[1000] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 px-4 py-3 animate-pulse">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-4 left-4 right-4 z-[1000] bg-red-50 dark:bg-red-900/30 rounded-xl shadow-2xl border border-red-200 dark:border-red-700 px-4 py-3">
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!currentInstruction) return null;

  const isArrive = currentInstruction.type === "arrive";

  return (
    <div
      className="absolute top-4 left-4 right-4 z-[1000] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden cursor-pointer transition active:scale-[0.98]"
      onClick={onExpand}
    >
      {/* Main instruction row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Maneuver icon */}
        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isArrive
            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
            : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
        }`}>
          <ManeuverIcon type={currentInstruction.type} modifier={currentInstruction.modifier} className="h-5 w-5" />
        </div>

        {/* Instruction text + distance to next turn */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
            {isArrive
              ? (destinationName || currentInstruction.text)
              : currentInstruction.text}
          </p>
          {!isArrive && remainingToNextInstruction > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {formatNavigationDistance(remainingToNextInstruction)}
            </p>
          )}
        </div>

        {/* Next street preview */}
        {nextInstruction && !isArrive && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
            <span className="truncate max-w-[100px]">{nextInstruction.streetName || nextInstruction.text}</span>
            <ManeuverIcon type={nextInstruction.type} modifier={nextInstruction.modifier} className="h-3.5 w-3.5 text-zinc-400" />
          </div>
        )}
      </div>

      {/* Bottom info bar: remaining distance + ETA */}
      <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/80 px-4 py-1.5 border-t border-zinc-100 dark:border-zinc-700/50">
        <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {formatNavigationDistance(remainingDistance)}
          </span>
          <span>·</span>
          <span>{formatNavigationDuration(remainingDuration)}</span>
        </div>
        {destinationName && !isArrive && (
          <span className="text-xs text-zinc-500 dark:text-zinc-500 truncate max-w-[140px]">
            → {destinationName}
          </span>
        )}
      </div>
    </div>
  );
}
