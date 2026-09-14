/**
 * Semantyka statusów zleceń / sesji — SSOT barw (amber / emerald / zinc).
 * Bez niebieskiego i fioletu w chrome UI.
 */

export type UiStatusTone = "planned" | "active" | "done";

export type UiStatusToneClasses = {
  pill: string;
  label: string;
  border: string;
  bar: string;
  fill: string;
};

const PLANNED: UiStatusToneClasses = {
  pill: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  label: "text-amber-700 dark:text-amber-400",
  border: "border-amber-200 dark:border-amber-500/20",
  bar: "bg-amber-500/90 dark:bg-amber-400/90",
  fill: "bg-amber-500 dark:bg-amber-600",
};

const ACTIVE: UiStatusToneClasses = {
  pill: "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-500 dark:border-emerald-500",
  label: "text-emerald-700 dark:text-emerald-400",
  border: "border-emerald-200 dark:border-emerald-500/20",
  bar: "bg-emerald-500/90 dark:bg-emerald-400/90",
  fill: "bg-emerald-500 dark:bg-emerald-600",
};

const DONE: UiStatusToneClasses = {
  pill: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  label: "text-emerald-700 dark:text-emerald-400",
  border: "border-emerald-200 dark:border-emerald-500/20",
  bar: "bg-emerald-500/90 dark:bg-emerald-400/90",
  fill: "bg-emerald-500 dark:bg-emerald-600",
};

export const UI_STATUS_TONE: Record<UiStatusTone, UiStatusToneClasses> = {
  planned: PLANNED,
  active: ACTIVE,
  done: DONE,
};

export function uiStatusToneClasses(tone: UiStatusTone): UiStatusToneClasses {
  return UI_STATUS_TONE[tone];
}

/** Pill statusu dyspozycji (PENDING / IN_PROGRESS / COMPLETED). */
export function dispatchStatusPillClass(status: string | null | undefined): string {
  if (status === "PENDING") return PLANNED.pill;
  if (status === "IN_PROGRESS") return ACTIVE.pill;
  return DONE.pill;
}

/** Poziomy logów urządzenia. */
export function logLevelColorClass(level: string): string {
  switch (level) {
    case "ERROR":
      return "text-red-500 bg-red-500/10 border-red-500/20";
    case "WARN":
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "DEBUG":
      return "text-zinc-500 bg-zinc-500/10 border-zinc-500/20";
    default:
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  }
}

export const GPS_DOT_ACTIVE = "bg-emerald-500 animate-pulse";
export const GPS_DOT_WAITING = "bg-amber-500 animate-pulse";
export const GPS_DOT_ERROR = "bg-red-500";

export const GPS_TEXT_ACTIVE = "text-emerald-500";
export const GPS_TEXT_WAITING = "text-amber-500";
export const GPS_TEXT_ERROR = "text-red-500";
