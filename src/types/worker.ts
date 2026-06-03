export type WorkOrderPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

/** Rodzaj zlecenia: machine_work (praca na maszynie) lub machine_repair (naprawa maszyny). */
export type OrderType = "machine_work" | "machine_repair";

export type Session = {
  id: number;
  startTime: string;
  endTime?: string;
  categoryId: number;
  categoryName: string | null;
  categoryColor?: string | null;
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
  /** Grupa maszyn (typ) z przypisanego zasobu — do filtrowania części DUR. */
  resourceGroupId?: number | null;
  materialName?: string | null;
  quantityTons?: number | null;
  /** Z załączników sesji (lista historii). */
  hasPhotos?: boolean;
  hasNotes?: boolean;
  /** Rodzaj zlecenia (machine_work | machine_repair) — propagowany z work_order lub kategorii. */
  orderType?: OrderType | null;
  /** Opis naprawy (dla machine_repair). */
  repairDescription?: string | null;
};

export type WorkOrder = {
  id: number;
  categoryId: number;
  categoryName: string | null;
  categoryColor?: string | null;
  categoryShowMaterial?: boolean;
  categoryShowCustomer?: boolean;
  categoryShowQuantity?: boolean;
  categoryShowTaskDescription?: boolean;
  taskDescription: string | null;
  resourceName: string | null;
  resourceId?: number | null;
  userId?: number | null;
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
  /** Rodzaj zlecenia. */
  orderType?: OrderType | null;
  /** Opis naprawy (dla machine_repair). */
  repairDescription?: string | null;
  /** Kto utworzył zlecenie (edycja/usuwanie tylko gdy === bieżący pracownik). */
  createdById?: number | null;
  materialId?: number | null;
  customerId?: number | null;
};

/** Część zamienna użyta w zleceniu naprawy (widok dla workera). */
export type WorkOrderSparePart = {
  id: number;
  workOrderId: number;
  partId: number;
  partName: string | null;
  partSku: string | null;
  quantity: string;
  unitPrice: string | null;
  notes: string | null;
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
  /** Moduł utrzymania ruchu włączony dla organizacji. */
  durEnabled?: boolean;
};

export type UserData = {
  id?: number;
  canCreateOwnOrders?: boolean;
  notificationsEnabled?: boolean;
  canEditRoute?: boolean;
  canCreateCustomers?: boolean;
  /** Czy pracownik DUR (może tworzyć zlecenia naprawy). */
  isDurWorker?: boolean;
};

export type TimelineItem = {
  id: string;
  type: "photo" | "note";
  content: string;
  /** ID rekordu zdjęcia w tabeli session_photos (tylko dla typu 'photo') — używane do generowania Signed URL */
  photoId?: number;
  lat: number;
  lng: number;
  createdAt: string;
};

export type InitialWorkerData = {
  session: Session | null;
  events: {
    id: number;
    photoUrl: string | null;
    latitude: string | null;
    longitude: string | null;
    createdAt: Date;
  }[];
  notes: {
    id: number;
    note: string;
    latitude: string | null;
    longitude: string | null;
    createdAt: Date;
  }[];
  settings: AppSettings | null;
  user: UserData | null;
  workOrders: WorkOrder[];
};
