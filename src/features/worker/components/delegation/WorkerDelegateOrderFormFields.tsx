"use client";

import type { AppDictionary } from "@/i18n/types";
import { workerApi } from "@/lib/appRoutes";
import { fetchWithDeviceTelemetry } from "@/lib/fetchWithDeviceTelemetry";
import { parseJsonArray } from "@/lib/parseJsonArray";
import { narrowBaseCategories, narrowBaseMachines, narrowDelegatableWorkers } from "@/lib/narrow";

export type DelegationTarget = { id: number; fullName: string; orgLabel: string | null };
export type DelegationCategory = { id: number; name: string };
export type DelegationMachine = { id: number; name: string; categoryIds?: number[] };

export async function loadWorkerDelegationFormData(): Promise<{
  targets: DelegationTarget[];
  categories: DelegationCategory[];
  machines: DelegationMachine[];
}> {
  const [tRes, cRes, mRes] = await Promise.all([
    fetchWithDeviceTelemetry(
      "Worker: delegation targets",
      workerApi.delegationTargets,
      { cache: "no-store" },
      { category: "orders" }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker: categories",
      "/api/categories?leavesOnly=1",
      { cache: "no-store" },
      { category: "orders" }
    ).then(parseJsonArray),
    fetchWithDeviceTelemetry(
      "Worker: machines",
      "/api/machines",
      { cache: "no-store" },
      { category: "orders" }
    ).then(parseJsonArray),
  ]);
  return {
    targets: narrowDelegatableWorkers(tRes),
    categories: narrowBaseCategories(cRes).map((c) => ({ id: c.id, name: c.name })),
    machines: narrowBaseMachines(mRes),
  };
}

const fieldClass =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

export function WorkerDelegateOrderFormFields({
  dict,
  targets,
  categories,
  filteredMachines,
  userId,
  setUserId,
  categoryId,
  onCategoryChange,
  resourceId,
  setResourceId,
  taskDescription,
  setTaskDescription,
  dueDate,
  setDueDate,
}: {
  dict: AppDictionary["worker"]["client"];
  targets: DelegationTarget[];
  categories: DelegationCategory[];
  filteredMachines: DelegationMachine[];
  userId: string;
  setUserId: (val: string) => void;
  categoryId: string;
  onCategoryChange: (val: string) => void;
  resourceId: string;
  setResourceId: (val: string) => void;
  taskDescription: string;
  setTaskDescription: (val: string) => void;
  dueDate: string;
  setDueDate: (val: string) => void;
}) {
  return (
    <>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{dict.delegateChooseWorker}</span>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className={fieldClass}
          required
        >
          <option value="">—</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
              {t.orgLabel ? ` (${t.orgLabel})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{dict.delegateChooseCategory}</span>
        <select
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={fieldClass}
          required
        >
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{dict.delegateChooseMachine}</span>
        <select
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          className={fieldClass}
          required
          disabled={!categoryId}
        >
          <option value="">—</option>
          {filteredMachines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{dict.delegateTaskDescription}</span>
        <textarea
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          rows={3}
          className={fieldClass}
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{dict.delegateDueDate}</span>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className={fieldClass}
        />
      </label>
    </>
  );
}
