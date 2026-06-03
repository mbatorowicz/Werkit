"use client";

import type { WorkOrderPriority } from "@/types/worker";
import {
  WORK_ORDER_PRIORITY_DOT_PX,
  workOrderPriorityDotClassName,
  workOrderPriorityLabel,
  type WorkOrderPriorityLabels,
} from "@/lib/workOrderPriorityStyles";

export type { WorkOrderPriorityLabels };

/**
 * Priorytet zlecenia — kolorowa kropka; pełna etykieta w `title` przy najechaniu.
 * Jednolity wzorzec w workerze i na dyspozycji admina.
 */
export function WorkOrderPriorityRibbon({
  priority,
  labels,
}: {
  priority: WorkOrderPriority | null;
  labels: WorkOrderPriorityLabels;
  /** @deprecated Zawsze kropka — prop ignorowany, zostawiony dla kompatybilności call-site. */
  accentOnly?: boolean;
}) {
  const label = workOrderPriorityLabel(priority, labels);
  const dotClass = workOrderPriorityDotClassName(priority);

  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex shrink-0 cursor-default items-center justify-center"
    >
      <span
        className={`rounded-full shadow-sm ${dotClass}`}
        style={{ width: WORK_ORDER_PRIORITY_DOT_PX, height: WORK_ORDER_PRIORITY_DOT_PX }}
        aria-hidden
      />
    </span>
  );
}
