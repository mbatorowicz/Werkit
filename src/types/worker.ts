export type WorkOrderPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export type Session = {
  id: number;
  startTime: string;
  endTime?: string;
  categoryId: number;
  categoryName: string | null;
  /** Typ sprzętu „stacjonarny” — bez śledzenia trasy i geofencingu dotarcia. */
  categoryIsStationary?: boolean;
  status: string;
  customerAddress?: string | null;
  customerLat?: string | null;
  customerLng?: string | null;
  customerLocationId?: number | null;
  routeWaypoints?: { lat: number; lng: number }[];
  expectedDurationHours?: string | null;
  taskDescription?: string | null;
  workOrderId?: number | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  resourceName?: string | null;
  materialName?: string | null;
  quantityTons?: number | null;
  /** Z załączników sesji (lista historii). */
  hasPhotos?: boolean;
  hasNotes?: boolean;
};

export type WorkOrder = {
  id: number;
  categoryId: number;
  categoryName: string | null;
  taskDescription: string | null;
  resourceName: string | null;
  materialName: string | null;
  customerName: string | null;
  priority: WorkOrderPriority | null;
  dueDate: string | null;
  createdAt: string;
  expectedDurationHours?: number | null;
  quantityTons?: number | null;
  creatorName?: string | null;
  /** Z realizacji powiązanej sesji (jeśli była). */
  hasPhotos?: boolean;
  hasNotes?: boolean;
};

export type Coord = {
  lat: number;
  lng: number;
  heading?: number | null;
  /** ISO 8601 — do kolorowania śladu wg prędkości (odstęp czasu między próbkami). */
  recordedAt?: string;
};

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
  canEditRoute?: boolean;
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
