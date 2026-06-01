"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { WorkOrderScheduleFields } from "@/components/work-orders/WorkOrderScheduleFields";
import { buildWorkOrderScheduleFieldLabels } from "@/components/work-orders/scheduleConflictI18n";
import { getDictionary } from "@/i18n";
import type { AppDictionary } from "@/i18n/types";
import type { WizardCategory, WizardMachine } from "@/types/wizard";

type Dict = AppDictionary["worker"]["client"];

type Props = {
  dict: Dict;
  selectedCategory: WizardCategory | undefined;
  machines: WizardMachine[];
  resourceId: string;
  userId: string;
  dueDate: string;
  setDueDate: (v: string) => void;
  expectedDurationHours: string;
  setExpectedDurationHours: (v: string) => void;
  hasConflicts: boolean;
  setHasConflicts: (v: boolean) => void;
  setStep: (s: number) => void;
};

export function WizardStep4Schedule({
  dict,
  selectedCategory,
  machines,
  resourceId,
  userId,
  dueDate,
  setDueDate,
  expectedDurationHours,
  setExpectedDurationHours,
  hasConflicts,
  setHasConflicts,
  setStep,
}: Props) {
  const scheduleLabels = buildWorkOrderScheduleFieldLabels(getDictionary().workOrdersSchedule, {
    mode: "worker",
  });

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        {dict.wizardStep4ScheduleTitle}
      </h2>
      <p className="text-zinc-500 text-sm mb-4">{dict.wizardStep4ScheduleSubtitle}</p>

      <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-3 mb-6 space-y-2">
        <div className="flex justify-between items-center">
          <div className="text-sm">
            <span className="text-zinc-500">{dict.wizardSelectedType} </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {selectedCategory?.name}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-700 pt-2">
          <div className="text-sm">
            <span className="text-zinc-500">{dict.wizardSelectedMachine} </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {machines.find((m) => m.id.toString() === resourceId)?.name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="text-xs text-zinc-500 underline"
          >
            {dict.wizardChangeLink}
          </button>
        </div>
      </div>

      <WorkOrderScheduleFields
        mode="worker"
        scope="worker"
        userId={userId}
        resourceId={resourceId}
        dueDate={dueDate}
        expectedDurationHours={expectedDurationHours}
        onDueDateChange={setDueDate}
        onExpectedDurationHoursChange={setExpectedDurationHours}
        labels={scheduleLabels}
        onPreviewChange={({ hasConflicts: next }) => setHasConflicts(next)}
      />

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(3)}
          className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {dict.wizardBack}
        </button>
        <button
          type="button"
          disabled={hasConflicts}
          onClick={() => setStep(5)}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2"
        >
          {dict.wizardNext} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
