"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { getDictionary } from "@/i18n";

import { UnifiedGanttItem, BaseWorker, BaseMachine } from "@/types/admin";
import { INLINE_SCROLL_X_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { GanttHeader } from "@/components/GanttChart/GanttHeader";
import { GanttTimeline } from "@/components/GanttChart/GanttTimeline";
import { GanttRow } from "@/components/GanttChart/GanttRow";
import { GanttLegend } from "@/components/GanttChart/GanttLegend";

type GanttProps = {
  workers: BaseWorker[];
  machines: BaseMachine[];
  unifiedItems: UnifiedGanttItem[];
  onItemClick?: (item: UnifiedGanttItem) => void;
};

export default function GanttChart({ workers, machines, unifiedItems, onItemClick }: GanttProps) {
  const [groupBy, setGroupBy] = useState<"WORKER" | "MACHINE">("WORKER");
  const dict = getDictionary().admin.gantt;
  const fields = getDictionary().admin.orderFields;

  const formatItemTooltip = (
    item: UnifiedGanttItem,
    opts: {
      date?: string;
      time?: string;
      footer: string;
    }
  ) => {
    const customerName = `${item.customerLastName || ""} ${item.customerFirstName || ""}`.trim();
    return [
      `#${item.workOrderId || item.id}`,
      `${fields.orderType}: ${item.categoryName || "—"}`,
      `${fields.resource}: ${item.resourceName || "—"}`,
      `${fields.material}: ${item.materialName || "—"}`,
      `${fields.quantity}: ${item.quantityTons ? `${item.quantityTons}t` : "—"}`,
      `${fields.customer}: ${customerName || "—"}`,
      opts.date ? `${fields.date}: ${opts.date}` : null,
      opts.time ? `${fields.time}: ${opts.time}` : null,
      opts.footer,
    ]
      .filter(Boolean)
      .join("\n");
  };

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

  const getDimensions = (start: Date, durationHours: number) => {
    let itemStartMs = start.getTime();
    let itemEndMs = itemStartMs + durationHours * 3600000;

    if (itemEndMs <= dStart.getTime() || itemStartMs >= dEnd.getTime()) {
      return null;
    }

    if (itemStartMs < dStart.getTime()) {
      itemStartMs = dStart.getTime();
    }
    if (itemEndMs > dEnd.getTime()) {
      itemEndMs = dEnd.getTime();
    }

    const visibleDurationHours = (itemEndMs - itemStartMs) / 3600000;
    if (visibleDurationHours <= 0) return null;

    const visibleStart = new Date(itemStartMs);
    const startMinsFromStartHour =
      (visibleStart.getHours() - startHour) * 60 + visibleStart.getMinutes();

    const totalMins = totalHours * 60;

    const left = (startMinsFromStartHour / totalMins) * 100;
    const width = ((visibleDurationHours * 60) / totalMins) * 100;

    return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };
  };

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

            {rows.every((row) => {
              return !unifiedItems.some((item) => {
                const matchesRow =
                  groupBy === "WORKER" ? item.userId === row.id : item.resourceId === row.id;
                if (!matchesRow) return false;
                const tStart = item.startTime
                  ? new Date(item.startTime)
                  : item.dueDate
                    ? new Date(item.dueDate)
                    : null;
                if (!tStart) return false;
                const tEnd = item.endTime
                  ? new Date(item.endTime as string)
                  : item.status === "IN_PROGRESS"
                    ? new Date()
                    : item.dueDate
                      ? new Date(
                          new Date(item.dueDate as string).getTime() +
                            Number(item.expectedDurationHours || 2) * 3600000
                        )
                      : tStart;
                return tStart <= dEnd && tEnd >= dStart;
              });
            }) && (
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
