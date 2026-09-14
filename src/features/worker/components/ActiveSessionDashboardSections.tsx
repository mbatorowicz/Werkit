"use client";

import { Clock, MapPin, Camera, FileText, X, Square } from "lucide-react";
import dynamic from "next/dynamic";
import type { AppDictionary } from "@/i18n/types";
import { formatUiDateOnly, formatUiTimeHm, type Locale } from "@/i18n";
import type { Session, Coord, AppSettings, TimelineItem } from "@/types/worker";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import {
  categoryFlagsFromWorkOrderRow,
  orderLabelDescriptionText,
  resolveOrderLabelFieldVisibility,
} from "@/lib/orderLabelFieldVisibility";
import { ActiveSessionSessionTimer } from "@/features/worker/components/ActiveSessionSessionTimer";
import { UiButton } from "@/components/UiButton";
import { ALERT_WARNING } from "@/lib/uiChrome";
import { cn } from "@/lib/cn";
import {
  GPS_DOT_ACTIVE,
  GPS_DOT_ERROR,
  GPS_DOT_WAITING,
  GPS_TEXT_ACTIVE,
  GPS_TEXT_ERROR,
  GPS_TEXT_WAITING,
} from "@/lib/uiStatus";

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), { ssr: false });

type WorkerClientDict = AppDictionary["worker"]["client"];

export function ActiveSessionOrderCard({
  session,
  dict,
  tonsSuffix,
  locale,
  timelineEvents,
  onOpenDetails,
}: {
  session: Session;
  dict: WorkerClientDict;
  tonsSuffix: string;
  locale: Locale;
  timelineEvents: TimelineItem[];
  onOpenDetails: () => void;
}) {
  return (
    <OrderLabelCard
      tone="active"
      layout="teaser"
      orderNo={session.workOrderId ? `#${session.workOrderId}` : `#${session.id}`}
      onCardClick={onOpenDetails}
      cardAriaLabel={dict.orderDetailsOpenCategory}
      mode={session.categoryName || dict.noCategoryName}
      modeColor={session.categoryColor}
      machine={session.resourceName || "—"}
      material={session.materialName}
      quantity={session.quantityTons ? `${session.quantityTons}${tonsSuffix}` : null}
      customerFirstName={session.customerFirstName}
      customerLastName={session.customerLastName}
      customerPhone={session.customerPhone}
      customerAddress={session.customerAddress}
      description={orderLabelDescriptionText({
        orderType: session.orderType,
        taskDescription: session.taskDescription,
        repairDescription: session.repairDescription,
      })}
      fieldVisibility={resolveOrderLabelFieldVisibility(
        {
          orderType: session.orderType,
          ...categoryFlagsFromWorkOrderRow(session),
        },
        locale
      )}
      dateLabel={formatUiDateOnly(session.startTime)}
      timeLabel={`${formatUiTimeHm(session.startTime)} – …`}
      attachmentPhotos={timelineEvents.some((e) => e.type === "photo")}
      attachmentNotes={timelineEvents.some((e) => e.type === "note")}
    />
  );
}

export function ActiveSessionStatusWidget({
  dict,
  isStationarySession,
  gpsStatus,
  startTime,
}: {
  dict: WorkerClientDict;
  isStationarySession: boolean;
  gpsStatus: "waiting" | "active" | "error";
  startTime: string;
}) {
  return (
    <div className="w-full flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
      <div>
        <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">
          {dict.timeElapsed}
        </div>
        <div className="font-mono text-3xl font-bold text-zinc-900 dark:text-white tracking-tighter">
          <ActiveSessionSessionTimer startTime={startTime} />
        </div>
      </div>
      {isStationarySession ? (
        <div className="max-w-[58%] text-right">
          <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">
            {dict.sessionStationaryBadge}
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-snug">
            {dict.sessionStationaryGpsNote}
          </p>
        </div>
      ) : (
        <div className="text-right">
          <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1.5 flex items-center justify-end gap-1">
            {dict.gpsSignal}
            <div
              title={dict.gpsSessionOnlyHint}
              className="text-zinc-400 bg-zinc-200 dark:bg-zinc-700 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold cursor-help cursor-pointer"
            >
              ?
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                gpsStatus === "active"
                  ? GPS_DOT_ACTIVE
                  : gpsStatus === "waiting"
                    ? GPS_DOT_WAITING
                    : GPS_DOT_ERROR
              )}
            />
            <span
              className={cn(
                "text-xs font-bold",
                gpsStatus === "active"
                  ? GPS_TEXT_ACTIVE
                  : gpsStatus === "waiting"
                    ? GPS_TEXT_WAITING
                    : GPS_TEXT_ERROR
              )}
            >
              {gpsStatus === "active"
                ? dict.connOk
                : gpsStatus === "waiting"
                  ? dict.searching
                  : dict.error}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActiveSessionTimeOverrunBanner({ dict }: { dict: WorkerClientDict }) {
  return (
    <div className={cn(ALERT_WARNING, "mt-4 flex items-center gap-3")}>
      <div className="shrink-0 rounded-full bg-amber-100 p-2 dark:bg-amber-500/20">
        <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400" />
      </div>
      <div className="text-sm font-medium">{dict.timeOverrunWarn}</div>
    </div>
  );
}

export function ActiveSessionRouteStats({
  dict,
  traveledKm,
  destination,
  distanceToDestKm,
}: {
  dict: WorkerClientDict;
  traveledKm: number;
  destination: Coord | null;
  distanceToDestKm: number | null;
}) {
  return (
    <div className="w-full flex gap-4 mt-4">
      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
        <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">
          {dict.routeTraveled}
        </div>
        <div className="font-mono text-xl font-bold text-emerald-400">
          {traveledKm.toFixed(1)} <span className="text-sm text-zinc-500">{dict.km}</span>
        </div>
      </div>
      {destination && distanceToDestKm !== null && (
        <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
          <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">
            {dict.toDest}
          </div>
          <div className="font-mono text-xl font-bold text-amber-500">
            {distanceToDestKm.toFixed(1)} <span className="text-sm text-zinc-500">{dict.km}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActiveSessionMapSection({
  location,
  pathTraveled,
  destination,
  plannedRouteWaypoints,
  canEditRoute,
  onRouteWaypointsChange,
  setDistanceToDestKm,
  timelineEvents,
  setIsTimelineOpen,
  setSelectedEventId,
  destinationName,
  routePlanningEnabled = true,
  navigationEnabled = true,
}: {
  location: Coord | null;
  pathTraveled: Coord[];
  destination: Coord | null;
  plannedRouteWaypoints: Coord[];
  canEditRoute: boolean;
  onRouteWaypointsChange: (next: Coord[]) => void;
  setDistanceToDestKm: (val: number | null) => void;
  timelineEvents: TimelineItem[];
  setIsTimelineOpen: (val: boolean) => void;
  setSelectedEventId: (val: string | null) => void;
  destinationName: string | undefined;
  routePlanningEnabled?: boolean;
  navigationEnabled?: boolean;
}) {
  return (
    <div className="w-full h-64 md:h-80 mt-4 relative z-0 isolate rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-inner bg-white dark:bg-zinc-900">
      {location ? (
        <LiveMap
          currentLocation={location}
          pathTraveled={pathTraveled}
          destination={destination}
          plannedRouteWaypoints={plannedRouteWaypoints}
          preferPivotNavigation={navigationEnabled}
          enableOsrmRoute={routePlanningEnabled}
          enableNavigation={navigationEnabled}
          thumbnail
          editableRoute={canEditRoute && routePlanningEnabled}
          onAddRouteWaypoint={(lat, lng) => {
            onRouteWaypointsChange([...plannedRouteWaypoints, { lat, lng }]);
          }}
          onPlannedRouteWaypointsChange={onRouteWaypointsChange}
          onRouteDistance={(km) => setDistanceToDestKm(km)}
          events={timelineEvents}
          onEventClick={(id) => {
            setIsTimelineOpen(true);
            setSelectedEventId(id);
            setTimeout(() => {
              document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
          }}
          destinationName={destinationName}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <MapPin className="w-8 h-8 text-zinc-700 animate-bounce" />
        </div>
      )}
    </div>
  );
}

export function ActiveSessionActions({
  dict,
  settings,
  isStationarySession,
  setNoteText,
  setEditingNoteId,
  setIsNotesModalOpen,
  handlePhotoUpload,
  handleCheckpoint,
  isCancelWindowOpen,
  handleCancelSession,
  handleEndSession,
}: {
  dict: WorkerClientDict;
  settings: AppSettings | null;
  isStationarySession: boolean;
  setNoteText: (val: string) => void;
  setEditingNoteId: (val: number | null) => void;
  setIsNotesModalOpen: (val: boolean) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckpoint: () => void;
  isCancelWindowOpen: boolean;
  handleCancelSession: () => void;
  handleEndSession: () => void;
}) {
  return (
    <>
      {/* NOTATKI I ZDJĘCIA */}
      <div className="w-full grid grid-cols-2 gap-4 mt-4">
        <button
          onClick={() => {
            setNoteText("");
            setEditingNoteId(null);
            setIsNotesModalOpen(true);
          }}
          className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-4 flex flex-col items-center justify-center gap-2 transition-all border border-zinc-200 dark:border-zinc-700"
        >
          <FileText className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">{dict.addNote}</span>
        </button>
        <label className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-4 flex flex-col items-center justify-center gap-2 transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <Camera className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">{dict.camera}</span>
        </label>
      </div>

      {!isStationarySession && (
        <div className="w-full mt-4">
          <button
            onClick={handleCheckpoint}
            className="w-full bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg py-4 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <MapPin className="w-5 h-5" />
            <span className="font-bold uppercase tracking-wider text-sm">{dict.reportArrived}</span>
          </button>
        </div>
      )}

      <div
        className={`mt-4 w-full grid ${isCancelWindowOpen ? "grid-cols-2 gap-4" : "grid-cols-1"}`}
      >
        {isCancelWindowOpen && (
          <button
            onClick={handleCancelSession}
            className="w-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-4 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <X className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-xs">{dict.cancelStart}</span>
            </div>
          </button>
        )}
        <UiButton type="button" variant="ctaDanger" onClick={handleEndSession}>
          <div className="flex items-center gap-2">
            <Square className="w-5 h-5 fill-current" />
            <span className="font-bold uppercase tracking-wider text-sm">{dict.finish}</span>
          </div>
          {settings?.requirePhotoToFinish && (
            <span className="text-[9px] font-medium text-white/80 tracking-widest uppercase">
              {dict.requiresPhoto}
            </span>
          )}
        </UiButton>
      </div>
    </>
  );
}
