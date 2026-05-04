"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square, Loader2, Clock, AlertTriangle, Navigation, MapPin, Camera, FileText, X, History, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getDictionary } from "@/i18n";
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useWorkerNotifications } from '@/hooks/useWorkerNotifications';
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), { ssr: false, loading: () => <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div> });

type Session = {
  id: number;
  startTime: string;
  sessionType: string;
  status: string;
  customerAddress?: string;
  customerLat?: string;
  customerLng?: string;
  expectedDurationHours?: string;
  taskDescription?: string;
};

type WorkOrder = {
  id: number;
  sessionType: string;
  taskDescription: string | null;
  resourceName: string | null;
  materialName: string | null;
  customerName: string | null;
  priority: string | null;
  dueDate: string | null;
};

type Coord = { lat: number, lng: number, heading?: number | null };

type Note = {
  id: number;
  note: string;
  createdAt: string;
};

type AppSettings = {
  requirePhotoToFinish?: boolean;
  geofenceRadiusMeters?: number;
  cancelWindowMinutes?: number;
  timeOverrunReminder?: boolean;
  upcomingOrderReminderMinutes?: number;
};

type UserData = {
  id?: number;
  canCreateOwnOrders?: boolean;
  notificationsEnabled?: boolean;
};

import { useWorkerGPS, getDistance } from '@/hooks/useWorkerGPS';

function SessionTimer({ startTime }: { startTime: string }) {
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = now - start;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return <>{elapsed}</>;
}

export type TimelineItem = {
  id: string;
  type: 'photo' | 'note';
  content: string;
  lat: number;
  lng: number;
  createdAt: string;
};

export default function WorkerClient({ initialData }: { initialData?: any }) {
  const getInitialTimeline = () => {
    const arr: TimelineItem[] = [];
    if (initialData?.events) {
      arr.push(...initialData.events.map((e: any) => ({
        id: `photo_${e.id}`, type: 'photo' as const, content: e.photoUrl,
        lat: parseFloat(e.latitude || '0'), lng: parseFloat(e.longitude || '0'), createdAt: e.createdAt
      })));
    }
    if (initialData?.notes) {
      arr.push(...initialData.notes.map((n: any) => ({
        id: `note_${n.id}`, type: 'note' as const, content: n.note,
        lat: parseFloat(n.latitude || '0'), lng: parseFloat(n.longitude || '0'), createdAt: n.createdAt
      })));
    }
    return arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const [timelineEvents, setTimelineEvents] = useState<TimelineItem[]>(getInitialTimeline());
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [session, setSession] = useState<Session | null>(initialData?.session || null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialData?.workOrders || []);
  const [isLoading, setIsLoading] = useState(!initialData);

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(initialData?.settings || null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(initialData?.user || null);

  const [location, setLocation] = useState<Coord | null>(null);
  const [pathTraveled, setPathTraveled] = useState<Coord[]>([]);
  const [destination, setDestination] = useState<Coord | null>(null);
  const [distanceToDestKm, setDistanceToDestKm] = useState<number | null>(null);
  const [traveledKm, setTraveledKm] = useState(0);

  const [gpsStatus, setGpsStatus] = useState<"waiting" | "active" | "error">("waiting");
  const router = useRouter();
  const dict = getDictionary().worker.client;
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const wakeLockRef = useRef<any>(null);
  const watchIdRef = useRef<any>(null);

  const fetchSessionAndPath = async (showLoader = true, fetchGpsPath = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [resSess, resOrders] = await Promise.all([
        fetch("/api/worker/session", { cache: "no-store" }),
        fetch("/api/worker/work-orders", { cache: "no-store" })
      ]);
      const sessData = await resSess.json();
      const ordersData = await resOrders.json();
      setWorkOrders(Array.isArray(ordersData) ? ordersData : []);

      if (fetchGpsPath) {
        try {
          const resPath = await fetch("/api/worker/gps", { cache: "no-store" });
          const pathData = await resPath.json();
          if (pathData.logs) {
            setPathTraveled(pathData.logs);
            let dist = 0;
            for (let i = 1; i < pathData.logs.length; i++) {
              dist += getDistance(pathData.logs[i - 1], pathData.logs[i]);
            }
            setTraveledKm(dist / 1000);
          }
        } catch (e) { }
      }

      if (sessData.settings) {
        setSettings(sessData.settings);
      }
      if (sessData.user) {
        setCurrentUser(sessData.user);
      }

      if (sessData.session) {
        setSession(sessData.session);

        const newTimeline: TimelineItem[] = [];
        if (sessData.events) {
          newTimeline.push(...sessData.events.map((e: any) => ({
            id: `photo_${e.id}`, type: 'photo' as const, content: e.photoUrl,
            lat: parseFloat(e.latitude || '0'), lng: parseFloat(e.longitude || '0'), createdAt: e.createdAt
          })));
        }
        if (sessData.notes) {
          newTimeline.push(...sessData.notes.map((n: any) => ({
            id: `note_${n.id}`, type: 'note' as const, content: n.note,
            lat: parseFloat(n.latitude || '0'), lng: parseFloat(n.longitude || '0'), createdAt: n.createdAt
          })));
        }
        newTimeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setTimelineEvents(newTimeline);

        // Use direct coordinates if available, otherwise fallback to geocode
        if (sessData.session.customerLat && sessData.session.customerLng) {
          setDestination({ lat: parseFloat(sessData.session.customerLat), lng: parseFloat(sessData.session.customerLng) });
        } else if (sessData.session.customerAddress && !destination) {
          try {
            const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sessData.session.customerAddress)}`);
            const geoData = await geo.json();
            if (geoData && geoData.length > 0) {
              setDestination({ lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) });
            }
          } catch (e) { console.error("Geocode fail") }
        }
      } else {
        setSession(null);
      }
    } catch (e) {
      console.error(e);
    }
    if (showLoader) setIsLoading(false);
  };

  useEffect(() => {
    if (!initialData) {
      fetchSessionAndPath(true, true);
    } else {
      fetchSessionAndPath(false, true); // only fetch gps path in background
    }
    // Polling is backed off to 30 seconds to save battery on mobile devices.
    const interval = setInterval(() => fetchSessionAndPath(false, false), 30000);
    return () => clearInterval(interval);
  }, [initialData]);

  // Timer Logic extracted to SessionTimer component to prevent full re-renders

  useWorkerGPS(session, setLocation, setPathTraveled, setTraveledKm, setGpsStatus);

  const handleEndSession = async () => {
    if (settings?.requirePhotoToFinish) {
      const hasPhoto = timelineEvents.some(e => e.type === 'photo');
      if (!hasPhoto) {
        alert(dict.photoReqFinish);
        return;
      }
    }

    if (!confirm("Czy na pewno chcesz zakończyć obecną zmianę/pracę?")) return;
    setIsLoading(true);
    try {
      await fetch("/api/worker/session", { method: "PUT" });
      await fetchSessionAndPath();
    } catch (e) {
      alert(dict.errEndSession);
      setIsLoading(false);
    }
  };



  const handleAcceptOrder = async (orderId: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/worker/work-orders/${orderId}/accept`, { method: "POST" });
      if (res.ok) {
        await fetchSessionAndPath();
      } else {
        alert(dict.errAcceptOrder);
        setIsLoading(false);
      }
    } catch (e) {
      alert(dict.errNetwork);
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setIsLoading(true);
      try {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => img.onload = resolve);
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
        else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.7);

        const res = await fetch("/api/worker/session/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: base64, location })
        });
        if (res.ok) {
          alert(dict.photoSaved);
          fetchSessionAndPath(false, false);
        } else {
          alert(dict.photoError);
        }
      } catch (err) {
        alert(dict.errProcessPhoto);
      }
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const isEditing = editingNoteId !== null;
      const url = "/api/worker/session/notes";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing
        ? { noteId: editingNoteId, note: noteText }
        : { note: noteText, location };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        alert(isEditing ? dict.noteUpdated : dict.noteAdded);
        setIsNotesModalOpen(false);
        setNoteText("");
        setEditingNoteId(null);
        fetchSessionAndPath(false, false);
      } else {
        alert(dict.errSaveNote);
      }
    } catch (e) {
      alert(dict.errNetwork);
    }
    setIsSubmittingNote(false);
  };

  const handleCancelSession = async () => {
    if (!confirm("Czy na pewno chcesz cofnąć rozpoczęcie tego zlecenia? To usunie obecną sesję i przywróci zlecenie do oczekujących.")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/worker/session/cancel", { method: "POST" });
      if (res.ok) {
        alert(dict.cancelSuccess);
        fetchSessionAndPath(true, true);
      } else {
        alert(dict.errCancel);
      }
    } catch (e) {
      alert(dict.errNetwork);
    }
    setIsLoading(false);
  };

  const handleCheckpoint = async () => {
    if (settings?.geofenceRadiusMeters && distanceToDestKm !== null) {
      const distMeters = distanceToDestKm * 1000;
      if (distMeters > settings.geofenceRadiusMeters) {
        if (!confirm(`Jesteś za daleko od celu (${Math.round(distMeters)}m, dozwolone: ${settings.geofenceRadiusMeters}m). Czy na pewno chcesz zameldować dotarcie na miejsce?`)) return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/worker/session/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "✅ Dojechał na miejsce", location })
      });
      if (res.ok) {
        alert(dict.arrivedSuccess);
        fetchSessionAndPath(false, false);
      } else {
        alert(dict.errArrived);
      }
    } catch (e) {
      alert(dict.errNetwork);
    }
    setIsLoading(false);
  };

  const isCancelWindowOpen = session && settings?.cancelWindowMinutes
    ? (new Date().getTime() - new Date(session.startTime).getTime()) / 60000 <= settings.cancelWindowMinutes
    : true;

  const { isTimeOverrun, overdueOrder, upcomingOrder } = useWorkerNotifications(session, workOrders, settings, currentUser);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
        <p className="text-zinc-500 mt-4 text-sm">Wczytywanie statusu...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-[80vh] py-4 space-y-6">
      {!session ? (
        <div className="w-full flex flex-col items-center justify-center mt-10 space-y-6">
          <div className="flex flex-col items-center">
            <button onClick={() => fetchSessionAndPath(true, true)} className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mb-6 shadow-inner cursor-pointer" title={dict.refresh}>
              <History className="w-10 h-10 text-zinc-700 dark:text-zinc-300" />
            </button>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{dict.readyToStart}</h2>
            <p className="text-zinc-500 text-center mb-6 text-sm max-w-[250px]">
              {dict.selectOrder}
            </p>
          </div>

          {workOrders.length > 0 && (
            <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2">{dict.pendingOrders}</h3>

              {overdueOrder && (
                <div className="w-full bg-red-50 dark:bg-red-500/10 border-2 border-red-500 dark:border-red-600 rounded-xl p-3 mb-2 flex items-start gap-3 shadow-sm animate-pulse">
                  <div className="bg-red-100 dark:bg-red-500/20 p-2 rounded-full shrink-0 mt-0.5">
                    <Clock className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-red-800 dark:text-red-300">Zlecenie opóźnione!</span>
                    <span className="text-xs text-red-700 dark:text-red-400/90 mt-0.5">
                      Zlecenie #{overdueOrder.id} powinno było się już rozpocząć.
                    </span>
                  </div>
                </div>
              )}

              {upcomingOrder && !overdueOrder && (
                <div className="w-full bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-400 dark:border-rose-500 rounded-xl p-3 mb-2 flex items-start gap-3 animate-pulse">
                  <div className="bg-rose-100 dark:bg-rose-500/20 p-2 rounded-full shrink-0 mt-0.5">
                    <Clock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-rose-800 dark:text-rose-300">{dict.upcomingTerm}</span>
                    <span className="text-xs text-rose-700 dark:text-rose-400/90 mt-0.5">
                      {dict.orderFastReq.replace('{id}', upcomingOrder.id.toString()).replace('{time}', new Date(upcomingOrder.dueDate!).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }))}
                    </span>
                  </div>
                </div>
              )}

              {workOrders.map(order => (
                <div key={order.id} className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-bold text-amber-900 dark:text-amber-500 flex items-center gap-2">
                        <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/30">#{order.id}</span>
                        <span className="text-amber-700/50 dark:text-amber-500/50">|</span>
                        <span>{order.sessionType === 'TRANSPORT' ? dict.transport : order.sessionType === 'MACHINE_OP' ? dict.machineOp : dict.workshop}</span>
                      </span>
                      {order.priority === 'HIGH' && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 shrink-0">
                          <div className="w-2 h-2 rounded-sm bg-red-500 shadow-sm shrink-0" />
                          <span className="text-[10px] font-bold text-red-700 dark:text-red-400">{dict.priorityHigh}</span>
                        </div>
                      )}
                      {(!order.priority || order.priority === 'NORMAL') && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 shrink-0">
                          <div className="w-2 h-2 rounded-sm bg-orange-500 shadow-sm shrink-0" />
                          <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">{dict.priorityNormal}</span>
                        </div>
                      )}
                      {order.priority === 'LOW' && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                          <div className="w-2 h-2 rounded-sm bg-emerald-500 shadow-sm shrink-0" />
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{dict.priorityLow}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-amber-700 dark:text-amber-600/80 mt-1">
                      {dict.machine} <span className="font-semibold">{order.resourceName}</span>
                    </span>
                    {order.sessionType === 'TRANSPORT' && (
                      <span className="text-xs text-amber-700 dark:text-amber-600/80">
                        {dict.aggregate} <span className="font-semibold">{order.materialName}</span> → {order.customerName}
                      </span>
                    )}
                    {order.sessionType !== 'TRANSPORT' && order.taskDescription && (
                      <span className="text-xs text-amber-700 dark:text-amber-600/80 mt-1">
                        {dict.task} {order.taskDescription}
                      </span>
                    )}
                    {order.dueDate && (
                      <div className="mt-2 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded w-fit">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">
                          {dict.term.replace('{date}', new Date(order.dueDate).toLocaleDateString('pl-PL')).replace('{time}', new Date(order.dueDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }))}
                        </span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleAcceptOrder(order.id)} className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm w-full">
                    <Play className="w-4 h-4 fill-current" />
                    <span className="text-sm font-bold uppercase tracking-wider">{dict.startTask}</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {(!currentUser || currentUser.canCreateOwnOrders !== false) && (
            <div className="w-full max-w-sm flex flex-col items-center mt-4">
              <div className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-4">{dict.or}</div>
              <Link href="/worker/wizard" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-5 px-6 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
                <Play className="w-6 h-6 fill-current" />
                <span className="text-lg font-bold uppercase tracking-wider">{dict.defineCustom}</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">

          {/* WIDGET STATUSU */}
          <div className="w-full flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
            <div>
              <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">{dict.timeElapsed}</div>
              <div className="font-mono text-3xl font-bold text-zinc-900 dark:text-white tracking-tighter">
                <SessionTimer startTime={session.startTime} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1.5 flex items-center justify-end gap-1">
                {dict.gpsSignal}
                <div title="GPS jest aktywny tylko w trakcie trwania zlecenia i wyłączy się po naciśnięciu Zakończ." className="text-zinc-400 bg-zinc-200 dark:bg-zinc-700 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[9px] font-bold cursor-help cursor-pointer">?</div>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <div className={`w-2 h-2 rounded-full ${gpsStatus === 'active' ? 'bg-emerald-500 animate-pulse' : gpsStatus === 'waiting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-xs font-bold ${gpsStatus === 'active' ? 'text-emerald-500' : gpsStatus === 'waiting' ? 'text-amber-500' : 'text-red-500'}`}>
                  {gpsStatus === 'active' ? dict.connOk : gpsStatus === 'waiting' ? dict.searching : dict.error}
                </span>
              </div>
            </div>
          </div>

          {isTimeOverrun && (
            <div className="w-full mt-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-3 flex gap-3 items-center">
              <div className="bg-rose-100 dark:bg-rose-500/20 p-2 rounded-full shrink-0">
                <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-sm text-rose-800 dark:text-rose-300 font-medium">
                {dict.timeOverrunWarn}
              </div>
            </div>
          )}

          {/* WIDGET TRASY */}
          <div className="w-full flex gap-4 mt-4">
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
              <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">{dict.routeTraveled}</div>
              <div className="font-mono text-xl font-bold text-emerald-400">{traveledKm.toFixed(1)} <span className="text-sm text-zinc-500">{dict.km}</span></div>
            </div>
            {destination && distanceToDestKm !== null && (
              <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">{dict.toDest}</div>
                <div className="font-mono text-xl font-bold text-amber-500">{distanceToDestKm.toFixed(1)} <span className="text-sm text-zinc-500">{dict.km}</span></div>
              </div>
            )}
          </div>

          {/* MAPA */}
          <div className="w-full h-64 md:h-80 mt-4 relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-inner bg-white dark:bg-zinc-900">
            {location ? (
              <LiveMap
                currentLocation={location}
                pathTraveled={pathTraveled}
                destination={destination}
                onRouteDistance={(km) => setDistanceToDestKm(km)}
                events={timelineEvents.map(e => ({ id: e.id, lat: e.lat, lng: e.lng, label: e.type === 'photo' ? 'Zdjęcie' : 'Notatka' }))}
                onEventClick={(id) => {
                  setIsTimelineOpen(true);
                  setSelectedEventId(id);
                  setTimeout(() => {
                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-8 h-8 text-zinc-700 animate-bounce" />
              </div>
            )}
          </div>

          {timelineEvents.length > 0 && (
            <div className="w-full mt-2">
              <button onClick={() => setIsTimelineOpen(!isTimelineOpen)} className="w-full bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Oś czasu ({timelineEvents.length})</span>
                </div>
                {isTimelineOpen ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
              </button>
              
              {isTimelineOpen && (
                <div className="mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 max-h-[300px] overflow-y-auto flex flex-col gap-4 shadow-inner relative scroll-smooth">
                  {timelineEvents.map((item, index) => (
                    <div key={item.id} id={item.id} className={`flex gap-3 relative ${selectedEventId === item.id ? 'bg-blue-50 dark:bg-blue-500/10 p-2 -mx-2 rounded-lg' : ''} transition-all`}>
                      {index < timelineEvents.length - 1 && (
                        <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-zinc-200 dark:bg-zinc-700"></div>
                      )}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${item.type === 'photo' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                        {item.type === 'photo' ? <Camera className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="text-[10px] text-zinc-400 mb-1">{new Date(item.createdAt).toLocaleTimeString()}</div>
                        {item.type === 'photo' ? (
                          <div className="w-16 h-16 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700">
                            <img src={item.content} alt="Zdarzenie" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="text-sm text-zinc-700 dark:text-zinc-300 break-words">{item.content}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NOTATKI I ZDJĘCIA */}
          <div className="w-full grid grid-cols-2 gap-4 mt-4">
            <button onClick={() => { setNoteText(''); setEditingNoteId(null); setIsNotesModalOpen(true); }} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-4 flex flex-col items-center justify-center gap-2 transition-all border border-zinc-200 dark:border-zinc-700">
              <FileText className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-wider">{dict.addNote}</span>
            </button>
            <label className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-4 flex flex-col items-center justify-center gap-2 transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
              <Camera className="w-6 h-6" />
              <span className="text-xs font-bold uppercase tracking-wider">{dict.camera}</span>
            </label>
          </div>

          <div className="w-full mt-4">
            <button onClick={handleCheckpoint} className="w-full bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg py-4 flex items-center justify-center gap-2 transition-all active:scale-95">
              <MapPin className="w-5 h-5" />
              <span className="font-bold uppercase tracking-wider text-sm">{dict.reportArrived}</span>
            </button>
          </div>

          <div className={`mt-4 w-full grid ${isCancelWindowOpen ? 'grid-cols-2 gap-4' : 'grid-cols-1'}`}>
            {isCancelWindowOpen && (
              <button onClick={handleCancelSession} className="w-full bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-4 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-sm">
                <div className="flex items-center gap-2">
                  <X className="w-5 h-5" />
                  <span className="font-bold uppercase tracking-wider text-xs">{dict.cancelStart}</span>
                </div>
              </button>
            )}
            <button onClick={handleEndSession} className="w-full bg-red-600 hover:bg-red-500 text-white rounded-lg py-4 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-[0_0_30px_-10px_rgba(220,38,38,0.4)]">
              <div className="flex items-center gap-2">
                <Square className="w-5 h-5 fill-current" />
                <span className="font-bold uppercase tracking-wider text-sm">{dict.finish}</span>
              </div>
              {settings?.requirePhotoToFinish && (
                <span className="text-[9px] font-medium text-white/80 tracking-widest uppercase">Wymaga min. 1 zdjęcia</span>
              )}
            </button>
          </div>
        </div>
      )}

      {isNotesModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsNotesModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{dict.addNoteToReport}</h2>
              <button onClick={() => setIsNotesModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">{dict.noteContent}</label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-24 resize-none"
                  placeholder={dict.typeNotes}
                />
              </div>
              <button disabled={isSubmittingNote} onClick={handleSaveNote} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-3 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none mb-4">
                {isSubmittingNote ? <Loader2 className="w-5 h-5 animate-spin" /> : (editingNoteId ? dict.update : dict.saveNote)}
              </button>

              {timelineEvents.some(e => e.type === 'note') && (
                <div className="flex flex-col gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800 max-h-48 overflow-y-auto">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">{dict.yourNotes}</label>
                  {timelineEvents.filter(e => e.type === 'note').map((n: TimelineItem) => (
                    <div key={n.id} className="flex justify-between items-start gap-2 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded border border-zinc-200 dark:border-zinc-700/50">
                      <div className="flex flex-col">
                        <span className="text-xs text-zinc-800 dark:text-zinc-200 break-words">{n.content}</span>
                        <span className="text-[9px] text-zinc-400">{new Date(n.createdAt).toLocaleTimeString('pl-PL')}</span>
                      </div>
                      <button
                        onClick={() => { setNoteText(n.content); setEditingNoteId(parseInt(n.id.replace('note_', ''))); setIsNotesModalOpen(true); }}
                        className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1"
                      >
                        {dict.edit}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest opacity-60">
        Werkit v{process.env.APP_VERSION || '0.0.0'}
      </div>
    </div>
  );
}


