import { describe, expect, it } from "vitest";
import { getSnoozeOptions, minutesUntilDue } from "@/features/worker/lib/workerAlarmSnooze";

describe("getSnoozeOptions", () => {
  it("bez terminu zwraca 10, 20, 30", () => {
    expect(getSnoozeOptions(null)).toEqual([10, 20, 30]);
  });

  it("filtruje opcje do pozostałego czasu", () => {
    expect(getSnoozeOptions(25)).toEqual([10, 20]);
    expect(getSnoozeOptions(30)).toEqual([10, 20, 30]);
    expect(getSnoozeOptions(10)).toEqual([10]);
  });

  it("gdy zostało mniej niż 10 min — jedna opcja z pozostałymi minutami", () => {
    expect(getSnoozeOptions(7)).toEqual([7]);
    expect(getSnoozeOptions(1)).toEqual([1]);
  });

  it("gdy termin minął — brak drzemki", () => {
    expect(getSnoozeOptions(0)).toEqual([]);
  });
});

describe("minutesUntilDue", () => {
  it("liczy minuty do dueDate", () => {
    const now = new Date("2026-05-16T10:00:00Z").getTime();
    const due = "2026-05-16T10:25:00Z";
    expect(minutesUntilDue(due, now)).toBe(25);
  });
});
