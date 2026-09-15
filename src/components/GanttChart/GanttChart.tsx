"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Clock, Plus, RefreshCw, X } from "lucide-react";
import { useDictionary } from "@/components/LocaleProvider";

import { UnifiedGanttItem, BaseWorker, BaseMachine } from "@/types/admin";
import { INLINE_SCROLL_X_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { GanttHeader } from "@/components/GanttChart/GanttHeader";
import { GanttTimeline } from "@/components/GanttChart/GanttTimeline";
import { GanttRow } from "@/components/GanttChart/GanttRow";
import { GanttLegend } from "@/components/GanttChart/GanttLegend";
import { GanttFullscreenFrame } from "@/components/GanttChart/GanttFullscreenFrame";
import { GanttPortraitCard } from "@/components/GanttChart/GanttPortraitCard";
import {
  createGanttItemTooltip,
  ganttRowsAllEmpty,
  getGanttDimensions,
} from "@/components/GanttChart/ganttTimeMath";
import {
  GANTT_GRID_OFFSET,
  GANTT_TOUCH_SCROLL_CLASS,
  type GanttDensity,
} from "@/components/GanttChart/ganttLayout";
import { useViewportOrientation } from "@/hooks/useViewportOrientation";
import { useGanttFullscreen } from "@/hooks/useGanttFullscreen";
import { cn } from "@/lib/cn";
import { ICON_HIT } from "@/lib/uiTokens";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";

type GanttProps = {
  workers: BaseWorker[];
  machines: BaseMachine[];
  unifiedItems: UnifiedGanttItem[];
  onItemClick?: (item: UnifiedGanttItem) => void;
  onNewOrder?: () => void;
  onRefresh?: () => void;
  canCreateOrder?: boolean;
};

type ChartModel = {
  groupBy: "WORKER" | "MACHINE";
  setGroupBy: (v: "WORKER" | "MACHINE") => void;
  startHour: number;
  endHour: number;
  setStartHour: (v: number) => void;
  setEndHour: (v: number) => void;
  selectedDateStr: string;
  setSelectedDateStr: (v: string) => void;
  handlePrevDay: () => void;
  handleNextDay: () => void;
  dict: Record<string, string>;
  rows: (BaseWorker | BaseMachine)[];
  unifiedItems: UnifiedGanttItem[];
  dStart: Date;
  dEnd: Date;
  totalHours: number;
  hours: number[];
  currentTimeLeft: number | null;
  currentTime: Date | null;
  onItemClick?: (item: UnifiedGanttItem) => void;
  formatItemTooltip: (
    item: UnifiedGanttItem,
    opts: { date?: string; time?: string; footer: string }
  ) => string;
  getDimensions: (start: Date, durationHours: number) => { left: string; width: string } | null;
};

export default function GanttChart({
  workers,
  machines,
  unifiedItems,
  onItemClick,
  onNewOrder,
  onRefresh,
  canCreateOrder = false,
}: GanttProps) {
  const [groupBy, setGroupBy] = useState<"WORKER" | "MACHINE">("WORKER");
  const fullDict = useDictionary();
  const dict = {
    ...fullDict.admin.gantt,
    hourFrom: fullDict.common.gantt.from,
    hourTo: fullDict.common.gantt.to,
    newOrder: fullDict.admin.orders.newOrder,
    tooltipRefresh: fullDict.admin.orders.tooltipRefresh,
  };
  const fields = fullDict.admin.orderFields;

  const formatItemTooltip = createGanttItemTooltip(fields);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split("T")[0];
  });

  const [startHour, setStartHour] = useState(6);
  const [endHour, setEndHour] = useState(23);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  const { isNarrow, isLandscape, isPortrait } = useViewportOrientation();
  const { fullscreenOpen, openFullscreen, closeFullscreen } = useGanttFullscreen(
    isNarrow,
    isLandscape,
    isPortrait
  );

  useEffect(() => {
    queueMicrotask(() => setCurrentTime(new Date()));
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isToday = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return selectedDateStr === today.toISOString().split("T")[0];
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() - 1);
    setSelectedDateStr(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() + 1);
    setSelectedDateStr(d.toISOString().split("T")[0]);
  };

  const rows = groupBy === "WORKER" ? workers : machines;

  const dStart = new Date(selectedDateStr);
  dStart.setHours(startHour, 0, 0, 0);
  const dEnd = new Date(selectedDateStr);
  dEnd.setHours(endHour, 0, 0, 0);

  const totalHours = endHour - startHour;

  let currentTimeLeft: number | null = null;
  if (currentTime && isToday()) {
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMins = startHour * 60;
    const endMins = endHour * 60;
    if (currentMins >= startMins && currentMins <= endMins) {
      currentTimeLeft = ((currentMins - startMins) / (totalHours * 60)) * 100;
    }
  }

  const getDimensions = (start: Date, durationHours: number) =>
    getGanttDimensions(start, durationHours, { dStart, dEnd, startHour, totalHours });

  const hours = Array.from({ length: totalHours + 1 }).map((_, i) => startHour + i);

  const model: ChartModel = {
    groupBy,
    setGroupBy,
    startHour,
    endHour,
    setStartHour,
    setEndHour,
    selectedDateStr,
    setSelectedDateStr,
    handlePrevDay,
    handleNextDay,
    dict,
    rows,
    unifiedItems,
    dStart,
    dEnd,
    totalHours,
    hours,
    currentTimeLeft,
    currentTime,
    onItemClick,
    formatItemTooltip,
    getDimensions,
  };

  const headerShared = {
    groupBy,
    setGroupBy,
    startHour,
    endHour,
    setStartHour,
    setEndHour,
    selectedDateStr,
    setSelectedDateStr,
    onPrevDay: handlePrevDay,
    onNextDay: handleNextDay,
    dict,
  };

  return (
    <GanttChartViews
      dict={dict}
      model={model}
      headerShared={headerShared}
      fullscreenOpen={fullscreenOpen}
      isPortrait={isPortrait}
      canCreateOrder={canCreateOrder}
      onNewOrder={onNewOrder}
      onRefresh={onRefresh}
      openFullscreen={openFullscreen}
      closeFullscreen={closeFullscreen}
    />
  );
}

function GanttChartViews({
  dict,
  model,
  headerShared,
  fullscreenOpen,
  isPortrait,
  canCreateOrder,
  onNewOrder,
  onRefresh,
  openFullscreen,
  closeFullscreen,
}: {
  dict: Record<string, string>;
  model: ChartModel;
  headerShared: {
    groupBy: "WORKER" | "MACHINE";
    setGroupBy: (v: "WORKER" | "MACHINE") => void;
    startHour: number;
    endHour: number;
    setStartHour: (v: number) => void;
    setEndHour: (v: number) => void;
    selectedDateStr: string;
    setSelectedDateStr: (v: string) => void;
    onPrevDay: () => void;
    onNextDay: () => void;
    dict: Record<string, string>;
  };
  fullscreenOpen: boolean;
  isPortrait: boolean;
  canCreateOrder: boolean;
  onNewOrder?: () => void;
  onRefresh?: () => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
}) {
  return (
    <>
      <div className="mb-6 hidden flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm lg:flex dark:border-zinc-700 dark:bg-zinc-900">
        <GanttHeader {...headerShared} />
        <GanttChartCanvas model={model} density="inline" />
        <GanttLegend dict={dict} />
      </div>

      <div className="lg:hidden">
        <GanttPortraitCard
          title={dict.portraitCardTitle}
          body={dict.portraitCardBody}
          openLabel={dict.openFullscreen}
          onOpen={openFullscreen}
        />
      </div>

      {fullscreenOpen ? (
        <GanttFullscreenFrame
          open
          onClose={closeFullscreen}
          showRotateHint={isPortrait}
          rotateHint={dict.rotateHint}
        >
          <GanttHeader
            {...headerShared}
            variant="compact"
            showHourRange={false}
            leading={
              <button
                type="button"
                onClick={closeFullscreen}
                aria-label={dict.closeFullscreen}
                className={cn(
                  ICON_HIT,
                  "rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                )}
              >
                <X className="h-4 w-4" />
              </button>
            }
            trailing={
              <GanttFullscreenActions
                canCreateOrder={canCreateOrder}
                newOrderLabel={dict.newOrder}
                refreshLabel={dict.tooltipRefresh}
                onNewOrder={onNewOrder}
                onRefresh={onRefresh}
              />
            }
          />
          <div className={cn("min-h-0 flex-1", GANTT_TOUCH_SCROLL_CLASS)}>
            <GanttChartCanvas model={model} density="touch" fillWidth />
          </div>
          <GanttLegend dict={dict} compact />
        </GanttFullscreenFrame>
      ) : null}
    </>
  );
}

function GanttFullscreenActions({
  canCreateOrder,
  newOrderLabel,
  refreshLabel,
  onNewOrder,
  onRefresh,
}: {
  canCreateOrder: boolean;
  newOrderLabel: string;
  refreshLabel: string;
  onNewOrder?: () => void;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          aria-label={refreshLabel}
          title={refreshLabel}
          className={cn(
            ICON_HIT,
            "rounded-lg border border-zinc-200 bg-white text-zinc-500 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
          )}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      ) : null}
      {canCreateOrder && onNewOrder ? (
        <button
          type="button"
          onClick={onNewOrder}
          aria-label={newOrderLabel}
          className={cn("flex items-center gap-1", BTN_PRIMARY_COMPACT)}
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{newOrderLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

function GanttChartCanvas({
  model,
  density,
  fillWidth = false,
}: {
  model: ChartModel;
  density: GanttDensity;
  fillWidth?: boolean;
}) {
  const {
    groupBy,
    dict,
    rows,
    unifiedItems,
    dStart,
    dEnd,
    startHour,
    totalHours,
    hours,
    currentTimeLeft,
    currentTime,
    onItemClick,
    formatItemTooltip,
    getDimensions,
  } = model;

  const inner: ReactNode = (
    <div className={cn("w-full", fillWidth ? "min-w-[720px]" : "min-w-[800px] lg:min-w-full")}>
      <GanttTimeline
        startHour={startHour}
        totalHours={totalHours}
        hours={hours}
        currentTimeLeft={currentTimeLeft}
        currentTime={currentTime}
        groupBy={groupBy}
        dict={dict}
        density={density}
      />

      <div className="flex flex-col relative pb-4">
        <div
          className={cn("absolute inset-0 pointer-events-none flex", GANTT_GRID_OFFSET[density])}
        >
          {hours.map((h) => (
            <div
              key={h}
              className="h-full border-l border-zinc-100 dark:border-zinc-800/30"
              style={{ left: `${((h - startHour) / totalHours) * 100}%`, position: "absolute" }}
            ></div>
          ))}
          {currentTimeLeft !== null && (
            <div
              className="h-full border-l border-red-400/40 z-30 pointer-events-none"
              style={{ left: `${currentTimeLeft}%`, position: "absolute" }}
            />
          )}
        </div>

        {rows.map((row) => (
          <GanttRow
            key={row.id}
            row={row}
            groupBy={groupBy}
            unifiedItems={unifiedItems}
            dStart={dStart}
            dEnd={dEnd}
            startHour={startHour}
            totalHours={totalHours}
            hours={hours}
            currentTimeLeft={currentTimeLeft}
            currentTime={currentTime}
            onItemClick={onItemClick}
            formatItemTooltip={formatItemTooltip}
            getDimensions={getDimensions}
            dict={dict}
            density={density}
          />
        ))}

        {ganttRowsAllEmpty(rows, unifiedItems, groupBy, dStart, dEnd) && (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">{dict.noOrders}</p>
          </div>
        )}
      </div>
    </div>
  );

  if (fillWidth) return inner;

  return <div className={`flex relative ${INLINE_SCROLL_X_PANEL_CLASS}`}>{inner}</div>;
}
