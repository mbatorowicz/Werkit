"use client";

import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { UI_RADIUS_CONTROL } from "@/lib/uiRadius";

export interface WorkOrderOwnOrderActionsProps {
  orderId: number;
  editLabel: string;
  deleteLabel: string;
  onDelete: () => void;
}

export function WorkOrderOwnOrderActions({
  orderId,
  editLabel,
  deleteLabel,
  onDelete,
}: WorkOrderOwnOrderActionsProps) {
  return (
    <div className="flex gap-2">
      <Link
        href={`/worker/orders/${orderId}/edit`}
        className={`flex-1 ${UI_RADIUS_CONTROL} border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 py-2.5 px-3 flex items-center justify-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800`}
      >
        <Pencil className="w-4 h-4" />
        {editLabel}
      </Link>
      <button
        type="button"
        onClick={onDelete}
        className={`${UI_RADIUS_CONTROL} border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 py-2.5 px-3 flex items-center justify-center gap-2 text-sm font-semibold text-red-800 dark:text-red-300 transition-colors hover:bg-red-100 dark:hover:bg-red-500/20`}
        title={deleteLabel}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
