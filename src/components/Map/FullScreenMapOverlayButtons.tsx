"use client";

import { X, Navigation, ExternalLink } from "lucide-react";
import { openGoogleNavigation, SAFE_TOP } from "./mapSharedComponents";
import { cn } from "@/lib/cn";
import { BTN_MAP_PILL } from "@/lib/uiButtons";

export interface FullScreenMapOverlayButtonsProps {
  onClose: () => void;
  closeLabel: string;
  navigateLabel: string;
  currentLocation: { lat: number; lng: number; heading?: number | null };
  destination: { lat: number; lng: number } | null;
  plannedRouteWaypoints: { lat: number; lng: number }[];
}

export function FullScreenMapOverlayButtons({
  onClose,
  closeLabel,
  navigateLabel,
  currentLocation,
  destination,
  plannedRouteWaypoints,
}: FullScreenMapOverlayButtonsProps) {
  return (
    <>
      {/* Floating close button — prawa strona, nie koliduje z WaypointControls po lewej */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 z-[1001] flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-md px-4 py-2.5 text-sm font-medium text-white shadow-lg border border-white/15 transition hover:bg-black/90 active:scale-95"
        style={{ top: `calc(${SAFE_TOP} + 8px)` }}
      >
        <X className="h-4 w-4" />
        <span>{closeLabel}</span>
      </button>

      {/* Przycisk "Nawiguj" — otwiera Google Maps z trasą, tylko gdy jest destination */}
      {destination && (
        <button
          type="button"
          onClick={() => openGoogleNavigation(destination, currentLocation, plannedRouteWaypoints)}
          className={cn(
            BTN_MAP_PILL,
            "absolute right-4 z-[1001] px-5 py-3 text-sm font-semibold backdrop-blur-md"
          )}
          style={{ top: `calc(${SAFE_TOP} + 60px)` }}
        >
          <Navigation className="h-4 w-4" />
          <span>{navigateLabel}</span>
          <ExternalLink className="h-3.5 w-3.5 text-emerald-200" />
        </button>
      )}
    </>
  );
}
