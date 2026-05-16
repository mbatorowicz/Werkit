export type WorkerAlarmActionHandlers = {
  onStartOrder: (orderId: number) => void;
  onAlarmDismissed: (alarmKey: string) => void;
};
