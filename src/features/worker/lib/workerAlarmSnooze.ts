const SNOOZE_STORAGE_KEY = "werkit_alarm_snooze";
const DISMISS_STORAGE_KEY = "werkit_alarm_dismissed";

const SNOOZE_CANDIDATES_MIN = [10, 20, 30] as const;

export type AlarmSnoozeMap = Record<string, number>;

function readSnoozeMap(): AlarmSnoozeMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: AlarmSnoozeMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function writeSnoozeMap(map: AlarmSnoozeMap): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SNOOZE_STORAGE_KEY, JSON.stringify(map));
}

function readDismissedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissedSet(set: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify([...set]));
}

/** Minuty do terminu zlecenia (zaokrąglone w dół); null = brak twardego terminu. */
export function minutesUntilDue(dueDate: string | null | undefined, nowMs = Date.now()): number | null {
  if (!dueDate) return null;
  const dueMs = new Date(dueDate).getTime();
  if (!Number.isFinite(dueMs)) return null;
  const diffMs = dueMs - nowMs;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / 60_000);
}

/**
 * Dozwolone drzemki: 10, 20, 30 min, nie dłużej niż do terminu.
 * Gdy zostało &lt; 10 min — jedna opcja = pozostałe minuty (min. 1).
 */
export function getSnoozeOptions(remainingMinutes: number | null): number[] {
  if (remainingMinutes === null) return [...SNOOZE_CANDIDATES_MIN];
  if (remainingMinutes <= 0) return [];
  const standard = SNOOZE_CANDIDATES_MIN.filter((m) => m <= remainingMinutes);
  if (standard.length > 0) return [...standard];
  return [Math.max(1, remainingMinutes)];
}

export function isSnoozed(alarmKey: string, nowMs = Date.now()): boolean {
  const until = readSnoozeMap()[alarmKey];
  return typeof until === "number" && until > nowMs;
}

export function setSnooze(alarmKey: string, minutes: number, nowMs = Date.now()): void {
  const map = readSnoozeMap();
  map[alarmKey] = nowMs + Math.max(1, minutes) * 60_000;
  writeSnoozeMap(map);
}

export function clearSnooze(alarmKey: string): void {
  const map = readSnoozeMap();
  delete map[alarmKey];
  writeSnoozeMap(map);
}

export function isDismissed(alarmKey: string): boolean {
  return readDismissedSet().has(alarmKey);
}

export function dismissAlarm(alarmKey: string): void {
  const set = readDismissedSet();
  set.add(alarmKey);
  writeDismissedSet(set);
}

export function clearDismissed(alarmKey: string): void {
  const set = readDismissedSet();
  set.delete(alarmKey);
  writeDismissedSet(set);
}

export function canFireAlarm(alarmKey: string, nowMs = Date.now()): boolean {
  return !isSnoozed(alarmKey, nowMs) && !isDismissed(alarmKey);
}

/** Usuwa legacy jednorazowej listy powiadomień. */
export function migrateLegacyNotifiedOrders(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("werkit_notified_orders");
}
