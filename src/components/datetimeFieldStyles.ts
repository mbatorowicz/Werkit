import { INPUT_BASE } from "@/lib/uiTokens";

/** SSOT klas pól daty / daty+czasu — spójne z formularzami admina i workera. */

export const WERKIT_DATE_INPUT_BASE = `werkit-datetime-field ${INPUT_BASE}`;

export type DateInputVariant = "admin" | "worker" | "compact";

export function dateInputClassName(variant: DateInputVariant, extra = ""): string {
  const variantClass =
    variant === "compact"
      ? "px-3 py-1.5 font-medium bg-white dark:bg-zinc-800 w-auto min-h-0"
      : "w-full appearance-none";
  return `${WERKIT_DATE_INPUT_BASE} ${variantClass} ${extra}`.trim();
}
