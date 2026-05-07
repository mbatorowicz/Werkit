export type Session = {
  id: number;
  startTime: string;
  sessionType: string;
  status: string;
  customerAddress?: string | null;
  customerLat?: string | null;
  customerLng?: string | null;
  expectedDurationHours?: string | null;
  taskDescription?: string | null;
  workOrderId?: number | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  resourceName?: string | null;
  materialName?: string | null;
  quantityTons?: number | null;
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
  createdAt: string;
  expectedDurationHours?: number | null;
  quantityTons?: number | null;
  creatorName?: string | null;
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

export type InitialWorkerData = {
  session: Session | null;
  events: { id: number; photoUrl: string | null; latitude: string | null; longitude: string | null; createdAt: Date }[];
  notes: { id: number; note: string; latitude: string | null; longitude: string | null; createdAt: Date }[];
  settings: AppSettings | null;
  user: UserData | null;
  workOrders: WorkOrder[];
};
