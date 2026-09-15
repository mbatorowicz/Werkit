/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach } from "vitest";
import { planNativeWorkerAlarms } from "@/features/worker/lib/planNativeWorkerAlarms";
import { dismissAlarm, setSnooze } from "@/features/worker/lib/workerAlarmSnooze";
import type { Session, WorkOrder } from "@/types/worker";

const dict = {
  timeOverrunTitle: "Czas",
  timeOverrunBody: "Sesja",
  orderOverdueTitle: "Zaległe",
  orderOverdueBody: "{label}",
  orderUpcomingTitle: "Wkrótce",
  orderUpcomingBody: "{label}",
  actionOk: "OK",
  actionStart: "Start",
  actionSnooze: "{minutes} min",
  snoozeSection: "Drzemka",
} as const;

const session: Session = {
  id: 1,
  startTime: "2026-09-15T08:00:00.000Z",
  categoryId: 1,
  categoryName: "Transport",
  status: "IN_PROGRESS",
  expectedDurationHours: "4",
};

const order = (id: number, dueDate: string): WorkOrder =>
  ({
    id,
    dueDate,
    customerName: `Klient ${id}`,
    status: "PENDING",
  }) as unknown as WorkOrder;

describe("planNativeWorkerAlarms", () => {
  const nowMs = new Date("2026-09-15T10:00:00.000Z").getTime();

  beforeEach(() => {
    localStorage.clear();
  });

  it("nie planuje nic gdy powiadomienia wyłączone", () => {
    expect(
      planNativeWorkerAlarms({
        nowMs,
        session,
        workOrders: [order(1, "2026-09-15T12:00:00.000Z")],
        settings: { upcomingOrderReminderMinutes: 120, timeOverrunReminder: true },
        notificationsEnabled: false,
        dict,
      })
    ).toEqual([]);
  });

  it("planuje zaległość na dueDate i zbliżające się na dueDate minus reminder", () => {
    const planned = planNativeWorkerAlarms({
      nowMs,
      session: null,
      workOrders: [order(7, "2026-09-15T14:00:00.000Z")],
      settings: { upcomingOrderReminderMinutes: 120 },
      notificationsEnabled: true,
      dict,
    });
    const kinds = planned.map((p) => p.alarm.kind).sort();
    expect(kinds).toEqual(["order_overdue", "order_upcoming"]);
    const upcoming = planned.find((p) => p.alarm.kind === "order_upcoming");
    const overdue = planned.find((p) => p.alarm.kind === "order_overdue");
    expect(upcoming?.atMs).toBe(new Date("2026-09-15T12:00:00.000Z").getTime());
    expect(overdue?.atMs).toBe(new Date("2026-09-15T14:00:00.000Z").getTime());
  });

  it("nie planuje alarmu który już trwa (zostawia JS + natychmiastowy fallback)", () => {
    const planned = planNativeWorkerAlarms({
      nowMs,
      session: null,
      workOrders: [order(3, "2026-09-15T09:00:00.000Z")],
      settings: { upcomingOrderReminderMinutes: 120 },
      notificationsEnabled: true,
      dict,
    });
    expect(planned).toEqual([]);
  });

  it("planuje przekroczenie czasu sesji na start + expectedDuration", () => {
    const planned = planNativeWorkerAlarms({
      nowMs,
      session,
      workOrders: [],
      settings: { timeOverrunReminder: true },
      notificationsEnabled: true,
      dict,
    });
    expect(planned).toHaveLength(1);
    expect(planned[0]?.alarm.kind).toBe("time_overrun");
    expect(planned[0]?.atMs).toBe(new Date("2026-09-15T12:00:00.000Z").getTime());
  });

  it("po drzemce planuje na czas snooze", () => {
    setSnooze("order_overdue_4", 20, nowMs);
    const planned = planNativeWorkerAlarms({
      nowMs,
      session: null,
      workOrders: [order(4, "2026-09-15T09:00:00.000Z")],
      settings: {},
      notificationsEnabled: true,
      dict,
    });
    expect(planned).toHaveLength(1);
    expect(planned[0]?.atMs).toBe(nowMs + 20 * 60_000);
  });

  it("pomija odrzucony alarm", () => {
    dismissAlarm("order_overdue_5");
    const planned = planNativeWorkerAlarms({
      nowMs,
      session: null,
      workOrders: [order(5, "2026-09-15T16:00:00.000Z")],
      settings: { upcomingOrderReminderMinutes: 30 },
      notificationsEnabled: true,
      dict,
    });
    expect(planned.every((p) => p.alarm.kind !== "order_overdue")).toBe(true);
  });
});
