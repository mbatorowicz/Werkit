"use client";

import { Bell, Play } from "lucide-react";
import { formatDict } from "@/i18n/format";
import type { AppDictionary } from "@/i18n/types";
import type { WorkerActiveAlarm } from "@/features/worker/lib/workerAlarmTypes";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";

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
    <AdminModalShell
      open
      onClose={onOk}
      title={alarm.title}
      maxWidthClass="max-w-sm"
      titleSize="lg"
      zIndexClass="z-[9999]"
      closeOnBackdropClick={false}
      scrollableBody={alarm.snoozeOptions.length > 0}
      footer={
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onOk}
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {dict.actionOk}
          </button>
          {alarm.canStart && alarm.orderId != null ? (
            <button
              type="button"
              onClick={onStart}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              <Play className="h-4 w-4" />
              {dict.actionStart}
            </button>
          ) : null}
          {alarm.snoozeOptions.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-700">
              <span className="text-center text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {dict.snoozeSection}
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {alarm.snoozeOptions.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => onSnooze(minutes)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    {formatDict(dict.actionSnooze, { minutes })}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col items-center px-6 py-4">
        <div className="mb-4 rounded-full bg-amber-100 p-3 dark:bg-amber-500/20">
          <Bell className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{alarm.body}</p>
      </div>
    </AdminModalShell>
  );
}
