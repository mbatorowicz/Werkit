/** Krok wyboru czasu (minuty) — tylko te wartości są w liście rozwijanej. */
export const DATETIME_LOCAL_STEP_MINUTES = 10;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Wszystkie godziny w dobie co 10 minut: 00:00 … 23:50. */
export const DATETIME_LOCAL_TIME_OPTIONS: readonly string[] = (() => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += DATETIME_LOCAL_STEP_MINUTES) {
      slots.push(`${pad2(hour)}:${pad2(minute)}`);
    }
  }
  return slots;
})();

const TIME_SLOT_SET = new Set(DATETIME_LOCAL_TIME_OPTIONS);

export function splitDatetimeLocal(value: string): { date: string; time: string } {
  const trimmed = value.trim();
  if (!trimmed.includes("T")) {
    return { date: "", time: "" };
  }
  const [datePart, timePart] = trimmed.split("T");
  const time = (timePart ?? "").slice(0, 5);
  return {
    date: datePart ?? "",
    time: snapTimeToAllowedSlot(time),
  };
}

export function joinDatetimeLocal(date: string, time: string): string {
  const d = date.trim();
  const t = time.trim();
  if (!d || !t) return "";
  return `${d}T${t}`;
}

/** Mapuje zapisaną wartość na dozwolony slot (np. stare zlecenia z minutą 26 → 14:30). */
export function snapTimeToAllowedSlot(time: string): string {
  const t = time.trim().slice(0, 5);
  if (!t) return "";
  if (TIME_SLOT_SET.has(t)) return t;

  const [hRaw, mRaw] = t.split(":");
  const h = Number.parseInt(hRaw ?? "", 10);
  const m = Number.parseInt(mRaw ?? "", 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "";

  const totalMinutes = h * 60 + m;
  const rounded =
    Math.round(totalMinutes / DATETIME_LOCAL_STEP_MINUTES) * DATETIME_LOCAL_STEP_MINUTES;
  const hours = Math.floor(rounded / 60) % 24;
  const minutes = rounded % 60;
  const snapped = `${pad2(hours)}:${pad2(minutes)}`;
  return TIME_SLOT_SET.has(snapped) ? snapped : "";
}

/** Normalizuje pełną wartość datetime-local przed zapisem / wyświetleniem w formularzu. */
export function snapDatetimeLocalValue(value: string): string {
  const { date, time } = splitDatetimeLocal(value);
  return joinDatetimeLocal(date, time);
}

/** @deprecated Użyj {@link snapDatetimeLocalValue} — zachowane dla istniejących importów. */
export const roundDatetimeLocalToStep = snapDatetimeLocalValue;

/** @deprecated Natywny `step` nie wymusza listy co 10 min we wszystkich przeglądarkach. */
export const DATETIME_LOCAL_STEP_SECONDS = DATETIME_LOCAL_STEP_MINUTES * 60;
