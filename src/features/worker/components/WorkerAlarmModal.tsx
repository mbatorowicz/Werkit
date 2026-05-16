"use client";

import { Bell, Play } from "lucide-react";
import { formatDict } from "@/i18n/format";
import type { AppDictionary } from "@/i18n/types";
import type { WorkerActiveAlarm } from "@/features/worker/lib/workerAlarmTypes";

type AlarmDict = AppDictionary["worker"]["alarms"];

export function WorkerAlarmModal({
  alarm,
  dict,
  onOk,
  onStart,
  onSnooze,
}: {
  alarm: WorkerActiveAlarm;
  dict: AlarmDict;
  onOk: () => void;
  onStart: () => void;
  onSnooze: (minutes: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-[200]">
      <AlarmBackdrop />
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-amber-100 dark:bg-amber-500/20 p-3 rounded-full mb-4">
              <Bell className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white text-center">{alarm.title}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center mt-2 leading-relaxed">{alarm.body}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={onOk} className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm">{dict.actionOk}</button>
            {alarm.canStart && alarm.orderId != null ? (
              <button type="button" onClick={onStart} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm flex items-center justify-center gap-2">
                <Play className="w-4 h-4" />
                {dict.actionStart}
              </button>
            ) : null}
            {alarm.snoozeOptions.length > 0 ? (
              <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-zinc-200 dark:border-zinc-700">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide text-center">{dict.snoozeSection}</span>
                <AlarmSnoozeRow alarm={alarm} dict={dict} onSnooze={onSnooze} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlarmBackdrop() {
  return <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />;
}

function AlarmSnoozeRow({
  alarm,
  dict,
  onSnooze,
}: {
  alarm: WorkerActiveAlarm;
  dict: AlarmDict;
  onSnooze: (m: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {alarm.snoozeOptions.map((minutes) => (
        <button key={minutes} type="button" onClick={() => onSnooze(minutes)} className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          {formatDict(dict.actionSnooze, { minutes })}
        </button>
      ))}
    </div>
  );
}
