"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { useDictionary } from "@/components/LocaleProvider";

import { UnifiedGanttItem, BaseWorker, BaseMachine } from "@/types/admin";
import { INLINE_SCROLL_X_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { GanttHeader } from "@/components/GanttChart/GanttHeader";
import { GanttTimeline } from "@/components/GanttChart/GanttTimeline";
import { GanttRow } from "@/components/GanttChart/GanttRow";
import { GanttLegend } from "@/components/GanttChart/GanttLegend";
import {
  createGanttItemTooltip,
  ganttRowsAllEmpty,
  getGanttDimensions,
} from "@/components/GanttChart/ganttTimeMath";

type GanttProps = {
  workers: BaseWorker[];
  machines: BaseMachine[];
  unifiedItems: UnifiedGanttItem[];
  onItemClick?: (item: UnifiedGanttItem) => void;
};

export default function GanttChart({ workers, machines, unifiedItems, onItemClick }: GanttProps) {
  const [groupBy, setGroupBy] = useState<"WORKER" | "MACHINE">("WORKER");
  const fullDict = useDictionary();
  const dict = {
    ...fullDict.admin.gantt,
    hourFrom: fullDict.common.gantt.from,
    hourTo: fullDict.common.gantt.to,
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

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm overflow-hidden flex flex-col mb-6">
      <GanttHeader
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        startHour={startHour}
        endHour={endHour}
        setStartHour={setStartHour}
        setEndHour={setEndHour}
        selectedDateStr={selectedDateStr}
        setSelectedDateStr={setSelectedDateStr}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        dict={dict}
      />

      <div className={`flex relative ${INLINE_SCROLL_X_PANEL_CLASS}`}>
        <div className="w-full min-w-[800px] lg:min-w-full">
          <GanttTimeline
            startHour={startHour}
            totalHours={totalHours}
            hours={hours}
            currentTimeLeft={currentTimeLeft}
            currentTime={currentTime}
            groupBy={groupBy}
            dict={dict}
          />

          <div className="flex flex-col relative pb-4">
            <div className="absolute inset-0 left-40 md:left-48 pointer-events-none flex">
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
      </div>

      <GanttLegend dict={dict} />
    </div>
  );
}
