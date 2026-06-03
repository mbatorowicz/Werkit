/** SSOT klas pól daty / daty+czasu — spójne z formularzami admina (mint + emerald focus). */

export const WERKIT_DATE_INPUT_BASE =
  "werkit-datetime-field rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

export type DateInputVariant = "admin" | "worker" | "compact";

export function dateInputClassName(variant: DateInputVariant, extra = ""): string {
  const base = WERKIT_DATE_INPUT_BASE;
  const variantClass =
    variant === "admin"
      ? "w-full min-h-[2.75rem] px-4 py-2.5 bg-[#f2fbfa] dark:bg-zinc-900 appearance-none"
      : variant === "worker"
        ? "w-full min-h-[2.75rem] px-4 py-3 bg-zinc-100 dark:bg-zinc-800 appearance-none"
        : "px-3 py-1.5 font-medium bg-white dark:bg-zinc-800";
  return `${base} ${variantClass} ${extra}`.trim();
}
