import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export function useWorkerNotifications(
  session: any,
  workOrders: any[],
  settings: any,
  currentUser: any
) {
  const isTimeOverrun = session && session.expectedDurationHours && settings?.timeOverrunReminder
    ? (new Date().getTime() - new Date(session.startTime).getTime()) / 3600000 > parseFloat(session.expectedDurationHours)
    : false;

  const overdueOrder = workOrders.find(order => {
    if (!order.dueDate) return false;
    const dueTime = new Date(order.dueDate).getTime();
    const now = new Date().getTime();
    return dueTime - now < 0; // Opóźnione
  });

  const upcomingOrder = workOrders.find(order => {
    if (!order.dueDate) return false;
    const dueTime = new Date(order.dueDate).getTime();
    const now = new Date().getTime();
    const reminderMs = (settings?.upcomingOrderReminderMinutes ?? 120) * 60 * 1000;
    return dueTime - now > 0 && dueTime - now < reminderMs;
  });

  useEffect(() => {
    if (!currentUser || currentUser.notificationsEnabled === false) return;
    if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;

    const checkNotifications = async () => {
      const notifiedStr = localStorage.getItem('werkit_notified_orders') || '[]';
      const notifiedArr: number[] = JSON.parse(notifiedStr);

      const triggerNotification = async (id: number, title: string, body: string) => {
        try {
          if (!notifiedArr.includes(id)) {
            let perm = { display: 'denied' };
            try {
              if (LocalNotifications && typeof LocalNotifications.requestPermissions === 'function') {
                perm = await LocalNotifications.requestPermissions();
              }
            } catch (e) { console.error(e); }

            if (perm.display === 'granted') {
              try {
                await LocalNotifications.schedule({
                  notifications: [
                    {
                      title,
                      body,
                      id: id,
                      schedule: { at: new Date(Date.now() + 1000) },
                    }
                  ]
                });
                notifiedArr.push(id);
                localStorage.setItem('werkit_notified_orders', JSON.stringify(notifiedArr));
              } catch (e) { console.error(e); }
            }
          }
        } catch (e) {
          console.error("Notification trigger error:", e);
        }
      };

      if (isTimeOverrun) await triggerNotification(999991, 'Przekroczony czas pracy!', 'Obecne zlecenie trwa dłużej niż zakładał plan.');
      if (overdueOrder) await triggerNotification(overdueOrder.id + 100000, 'Zlecenie opóźnione!', `Masz opóźnione zlecenie na: ${overdueOrder.customerName || overdueOrder.resourceName}`);
      if (upcomingOrder) await triggerNotification(upcomingOrder.id + 200000, 'Zbliżające się zlecenie!', `Masz zaplanowane zlecenie na: ${upcomingOrder.customerName || upcomingOrder.resourceName}`);
    };

    checkNotifications();
  }, [currentUser, isTimeOverrun, overdueOrder, upcomingOrder]);

  return { isTimeOverrun, overdueOrder, upcomingOrder };
}
