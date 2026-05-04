"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, User, Truck, Clock } from "lucide-react";
import { getDictionary } from "@/i18n";

type GanttProps = {
  workers: any[];
  machines: any[];
  unifiedItems: any[];
  onItemClick?: (item: any) => void;
};

export default function GanttChart({ workers, machines, unifiedItems, onItemClick }: GanttProps) {
  const [groupBy, setGroupBy] = useState<'WORKER' | 'MACHINE'>('WORKER');
  const dict = getDictionary().admin.gantt;

  // Default selected date to today
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const d = new Date();
    // Offset by timezone to ensure it sets the right local date string
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  });

  const [startHour, setStartHour] = useState(6);
  const [endHour, setEndHour] = useState(23);

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const isToday = () => {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    return selectedDateStr === today.toISOString().split('T')[0];
  };

  const handlePrevDay = () => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() - 1);
    setSelectedDateStr(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDateStr);
    d.setDate(d.getDate() + 1);
    setSelectedDateStr(d.toISOString().split('T')[0]);
  };

  const rows = groupBy === 'WORKER' ? workers : machines;

  // Start of day and End of day based on selected hours
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
    const startMinsFromStartHour = (visibleStart.getHours() - startHour) * 60 + visibleStart.getMinutes();

    const totalMins = totalHours * 60;

    const left = (startMinsFromStartHour / totalMins) * 100;
    const width = (visibleDurationHours * 60 / totalMins) * 100;

    return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };
  };

  // Generate hour markers
  const hours = Array.from({ length: totalHours + 1 }).map((_, i) => startHour + i);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm overflow-hidden flex flex-col mb-6">

      {/* Gantt Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0a0a0b] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center bg-white dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setGroupBy('WORKER')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${groupBy === 'WORKER' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
          >
            <User className="w-4 h-4" /> Pracownicy
          </button>
          <button
            onClick={() => setGroupBy('MACHINE')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${groupBy === 'MACHINE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-500 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
          >
            <Truck className="w-4 h-4" /> Sprzęt
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-zinc-500">Od:</label>
            <input
              type="number"
              min="0"
              max={endHour - 1}
              value={startHour}
              onChange={e => setStartHour(Math.min(endHour - 1, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-16 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
            />
            <label className="text-xs font-medium text-zinc-500">Do:</label>
            <input
              type="number"
              min={startHour + 1}
              max="24"
              value={endHour}
              onChange={e => setEndHour(Math.max(startHour + 1, Math.min(24, parseInt(e.target.value) || 24)))}
              className="w-16 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevDay} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDateStr}
              onChange={e => setSelectedDateStr(e.target.value)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-white outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button onClick={handleNextDay} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex relative">
        <div className="w-full">
          {/* Header row with hours */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 sticky top-0 z-10">
            <div className="w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-700 p-2 bg-zinc-50 dark:bg-[#0a0a0b] flex items-center">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{groupBy === 'WORKER' ? 'Pracownik' : 'Maszyna/Pojazd'}</span>
            </div>
            <div className="flex-1 relative h-10">
              {hours.map(h => (
                <div key={h} className="absolute top-0 bottom-0 border-l border-zinc-100 dark:border-zinc-800/50" style={{ left: `${((h - startHour) / totalHours) * 100}%` }}>
                  <span className="text-[10px] text-zinc-400 absolute -left-2.5 top-2 bg-white dark:bg-zinc-900 px-1">{h.toString().padStart(2, '0')}:00</span>
                </div>
              ))}
              {/* Current time header marker */}
              {currentTimeLeft !== null && (
                <div
                  className="absolute top-0 bottom-0 border-l border-red-400/40 z-20"
                  style={{ left: `${currentTimeLeft}%` }}
                >
                  <div className="absolute -left-5 top-1 px-1.5 py-0.5 bg-red-400/80 dark:bg-red-500/60 text-white/90 text-[9px] font-semibold rounded-sm whitespace-nowrap shadow-sm">
                    {currentTime?.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Body rows */}
          <div className="flex flex-col relative pb-4">
            {/* Draw hour lines for the entire body */}
            <div className="absolute inset-0 left-48 pointer-events-none flex">
              {hours.map(h => (
                <div key={h} className="h-full border-l border-zinc-100 dark:border-zinc-800/30" style={{ left: `${((h - startHour) / totalHours) * 100}%`, position: 'absolute' }}></div>
              ))}
              {/* Current time body line */}
              {currentTimeLeft !== null && (
                <div
                  className="h-full border-l border-red-400/40 z-30 pointer-events-none"
                  style={{ left: `${currentTimeLeft}%`, position: 'absolute' }}
                />
              )}
            </div>

            {rows.map(row => {
              const rowItems = unifiedItems.filter(item => {
                const matchesRow = groupBy === 'WORKER' ? item.userId === row.id : item.resourceId === row.id;
                if (!matchesRow) return false;

                const tStart = item.startTime ? new Date(item.startTime) : (item.dueDate ? new Date(item.dueDate) : null);
                if (!tStart) return false;
                // Item starts before end of day, and (ends after start of day or is just starting today)
                const tEnd = item.endTime ? new Date(item.endTime) : (item.status === 'IN_PROGRESS' ? new Date() : (item.dueDate ? new Date(new Date(item.dueDate).getTime() + (item.expectedDurationHours || 2) * 3600000) : tStart));
                return tStart <= dEnd && tEnd >= dStart;
              });

              if (rowItems.length === 0) return null; // Only show rows that have items for this day to save space, or show all? Let's show only rows with items to be clean.

              return (
                <div key={row.id} className="flex border-b border-zinc-100 dark:border-zinc-800/50 group hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                  <div className="w-48 shrink-0 border-r border-zinc-200 dark:border-zinc-700 p-2 bg-white dark:bg-zinc-900 flex flex-col justify-center">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200 truncate" title={groupBy === 'WORKER' ? row.fullName : row.name}>
                      {groupBy === 'WORKER' ? row.fullName : row.name}
                    </span>
                  </div>
                  <div className="flex-1 relative h-10 my-1">
                    {rowItems.map(item => {
                      const plannedStart = item.dueDate ? new Date(item.dueDate) : null;
                      const plannedDurationHours = parseFloat(item.expectedDurationHours || '2'); // fallback to 2h

                      const actualStart = item.startTime ? new Date(item.startTime) : null;
                      const actualEnd = item.endTime ? new Date(item.endTime) : (item.status === 'IN_PROGRESS' ? new Date() : null);

                      let plannedDims = null;
                      if (plannedStart) {
                        plannedDims = getDimensions(plannedStart, plannedDurationHours);
                      }

                      let actualDims = null;
                      if (actualStart) {
                        const durationMs = actualEnd ? (actualEnd.getTime() - actualStart.getTime()) : 0;
                        const durationHours = durationMs / 3600000;
                        actualDims = getDimensions(actualStart, Math.max(0.2, durationHours)); // min 12 mins width
                      }

                      if (!plannedDims && !actualDims) return null;

                      // Instead of wrapping them in an unpositioned absolute container, we just render them directly in the row relative container.
                      // Or we can use a React Fragment.
                      return (
                        <div
                          key={`${item._type}-${item.id}`}
                          onClick={() => {
                            if (onItemClick) {
                              onItemClick(item);
                            } else {
                              window.location.assign(`/admin/orders?open=${item.workOrderId || item.id}`);
                            }
                          }}
                          className="block cursor-pointer"
                        >
                          {plannedDims && (
                            <div
                              className="absolute top-1 bottom-1 border-2 border-dashed border-amber-500/50 rounded-md bg-amber-500/20 flex items-center px-2 overflow-hidden cursor-pointer hover:z-20 hover:scale-[1.02] transition"
                              style={{ left: plannedDims.left, width: plannedDims.width }}
                              title={`${dict.pendingOrder} #${item.workOrderId || item.id}\n${dict.date}: ${plannedStart?.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}\n${dict.estimatedTime}: ${plannedDurationHours}h\n${dict.clickToEdit}`}
                            >
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-500 whitespace-nowrap truncate">#{item.workOrderId || item.id}</span>
                            </div>
                          )}
                          {actualDims && (
                            <div
                              className={`absolute top-2.5 bottom-2.5 rounded shadow-sm flex items-center px-2 overflow-hidden cursor-pointer hover:z-20 hover:scale-[1.02] transition ${item.status === 'IN_PROGRESS' ? 'bg-blue-500 dark:bg-blue-600 animate-pulse' : 'bg-emerald-500 dark:bg-emerald-600'}`}
                              style={{ left: actualDims.left, width: actualDims.width }}
                              title={`Zlecenie #${item.workOrderId || item.id} (${item.status === 'IN_PROGRESS' ? dict.inProgress : dict.completed})\n${dict.start}: ${actualStart?.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}\n${dict.end}: ${actualEnd ? actualEnd.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : dict.inProgressShort}\n${dict.clickToDetails}`}
                            >
                              <span className="text-[10px] font-bold text-white whitespace-nowrap truncate">#{item.workOrderId || item.id}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* If all rows are empty, show a message */}
            {rows.every(row => {
              return !unifiedItems.some(item => {
                const matchesRow = groupBy === 'WORKER' ? item.userId === row.id : item.resourceId === row.id;
                if (!matchesRow) return false;
                const tStart = item.startTime ? new Date(item.startTime) : (item.dueDate ? new Date(item.dueDate) : null);
                if (!tStart) return false;
                const tEnd = item.endTime ? new Date(item.endTime) : (item.status === 'IN_PROGRESS' ? new Date() : (item.dueDate ? new Date(new Date(item.dueDate).getTime() + (item.expectedDurationHours || 2) * 3600000) : tStart));
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

      {/* Legend */}
      <div className="p-3 bg-zinc-50 dark:bg-[#0a0a0b] border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-6 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 border-2 border-dashed border-amber-500/50 bg-amber-500/20 rounded-sm"></div>
          <span>{dict.plannedWorkTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-blue-500 rounded-sm animate-pulse"></div>
          <span>{dict.inProgressLegend}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-emerald-500 rounded-sm"></div>
          <span>{dict.completedLegend}</span>
        </div>
      </div>
    </div>
  );
}
