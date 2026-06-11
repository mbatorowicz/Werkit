"use client";

import { Trash2 } from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import type { WorkOrderSparePartRow } from "@/features/worker/components/useWorkerSparePartsActions";

export function WorkerSparePartsList({
  isLoading,
  parts,
  workerDict,
  onReturnPart,
}: {
  isLoading: boolean;
  parts: WorkOrderSparePartRow[];
  workerDict: AppDictionary["worker"]["client"];
  onReturnPart: (lineId: number) => void;
}) {
  if (isLoading) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">Wczytywanie…</p>;
  }
  if (parts.length === 0) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">{workerDict.noSpareParts}</p>;
  }
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {parts.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-2 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
              {p.partName}
            </p>
            <p className="text-xs text-zinc-500">
              {p.partSku} · {p.quantity}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onReturnPart(p.id)}
            className="shrink-0 text-amber-600 transition hover:text-amber-500"
            title={workerDict.removeSparePart}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
