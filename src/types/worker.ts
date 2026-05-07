export type Session = {
  id: number;
  startTime: string;
  sessionType: string;
  status: string;
  customerAddress?: string;
  customerLat?: string;
  customerLng?: string;
  expectedDurationHours?: string;
  taskDescription?: string;
  workOrderId?: number;
  customerFirstName?: string;
  customerLastName?: string;
  resourceName?: string;
  materialName?: string;
  quantityTons?: number;
};

export type WorkOrder = {
  id: number;
  sessionType: string;
  taskDescription: string | null;
  resourceName: string | null;
  materialName: string | null;
  customerName: string | null;
  priority: string | null;
  dueDate: string | null;
};

export type Coord = { lat: number; lng: number; heading?: number | null };

export type Note = {
  id: number;
  note: string;
  createdAt: string;
};

export type AppSettings = {
  requirePhotoToFinish?: boolean;
  geofenceRadiusMeters?: number;
  cancelWindowMinutes?: number;
  timeOverrunReminder?: boolean;
  upcomingOrderReminderMinutes?: number;
};

export type UserData = {
  id?: number;
  canCreateOwnOrders?: boolean;
  notificationsEnabled?: boolean;
};

export type TimelineItem = {
  id: string;
  type: 'photo' | 'note';
  content: string;
  lat: number;
  lng: number;
  createdAt: string;
};
