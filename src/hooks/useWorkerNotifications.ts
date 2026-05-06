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
      const notifiedArr: number[] = JSON.parse(localStorage.getItem('werkit_notified_orders') || '[]');

      const triggerNotification = async (id: number, title: string, body: string) => {
        if (notifiedArr.includes(id)) return;

        try {
          // Verify permissions
          let hasPermission = false;
          if (LocalNotifications && typeof LocalNotifications.requestPermissions === 'function') {
            const perm = await LocalNotifications.requestPermissions();
            hasPermission = perm.display === 'granted';
          }

          if (!hasPermission) return;

          // Schedule Notification
          await LocalNotifications.schedule({
            notifications: [{
              title,
              body,
              id,
              schedule: { at: new Date(Date.now() + 1000) },
            }]
          });

          // Record as notified
          notifiedArr.push(id);
          localStorage.setItem('werkit_notified_orders', JSON.stringify(notifiedArr));

        } catch (e) {
          console.error(`Failed to trigger notification [${id}]:`, e);
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
