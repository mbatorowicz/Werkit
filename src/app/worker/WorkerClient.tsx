"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getDictionary } from "@/i18n";
import { Capacitor } from '@capacitor/core';

import { useWorkerNotifications } from '@/hooks/useWorkerNotifications';
import { useWorkerGPS, getDistance } from '@/hooks/useWorkerGPS';
import { Session, WorkOrder, Coord, AppSettings, UserData, TimelineItem, InitialWorkerData } from "@/types/worker";

import PendingOrdersList from "@/components/Worker/PendingOrdersList";
import ActiveSessionDashboard from "@/components/Worker/ActiveSessionDashboard";
import NotesModal from "@/components/Worker/Modals/NotesModal";
import GpsWarningModal from "@/components/Worker/Modals/GpsWarningModal";

export default function WorkerClient({ initialData }: { initialData: InitialWorkerData | null }) {
  const getInitialTimeline = () => {
    const arr: TimelineItem[] = [];
    if (initialData?.events) {
      arr.push(...initialData.events.map(e => ({
        id: `photo_${e.id}`, type: 'photo' as const, content: e.photoUrl || '',
        lat: parseFloat(e.latitude || '0'), lng: parseFloat(e.longitude || '0'), createdAt: new Date(e.createdAt).toISOString()
      })));
    }
    if (initialData?.notes) {
      arr.push(...initialData.notes.map(n => ({
        id: `note_${n.id}`, type: 'note' as const, content: n.note,
        lat: parseFloat(n.latitude || '0'), lng: parseFloat(n.longitude || '0'), createdAt: new Date(n.createdAt).toISOString()
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
  const dict = getDictionary().worker.client;
  const adminDict = getDictionary().admin.orders;

  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const [showGpsWarning, setShowGpsWarning] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);

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

      if (sessData.settings) setSettings(sessData.settings);
      if (sessData.user) setCurrentUser(sessData.user);

      if (sessData.session) {
        setSession(sessData.session);
        const newTimeline: TimelineItem[] = [];
        if (sessData.events) {
          newTimeline.push(...sessData.events.map((e: { id: number, photoUrl?: string, latitude?: string, longitude?: string, createdAt: string }) => ({
            id: `photo_${e.id}`, type: 'photo' as const, content: e.photoUrl || '',
            lat: parseFloat(e.latitude || '0'), lng: parseFloat(e.longitude || '0'), createdAt: new Date(e.createdAt).toISOString()
          })));
        }
        if (sessData.notes) {
          newTimeline.push(...sessData.notes.map((n: { id: number, note: string, latitude?: string, longitude?: string, createdAt: string }) => ({
            id: `note_${n.id}`, type: 'note' as const, content: n.note,
            lat: parseFloat(n.latitude || '0'), lng: parseFloat(n.longitude || '0'), createdAt: new Date(n.createdAt).toISOString()
          })));
        }
        newTimeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setTimelineEvents(newTimeline);

        if (sessData.session.customerLat && sessData.session.customerLng) {
          setDestination({ lat: parseFloat(sessData.session.customerLat), lng: parseFloat(sessData.session.customerLng) });
        } else if (sessData.session.customerAddress && !destination) {
          try {
            const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sessData.session.customerAddress)}`);
            const geoData = await geo.json();
            if (geoData && geoData.length > 0) {
              setDestination({ lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) });
            }
          } catch (e) {}
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
    if (!initialData) fetchSessionAndPath(true, true);
    else fetchSessionAndPath(false, true); 
    const interval = setInterval(() => fetchSessionAndPath(false, false), 30000);
    return () => clearInterval(interval);
  }, [initialData]);

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
      if (res.ok) await fetchSessionAndPath();
      else {
        alert(dict.errAcceptOrder);
        setIsLoading(false);
      }
    } catch (e) {
      alert(dict.errNetwork);
      setIsLoading(false);
    }
  };

  const requestAcceptOrder = (orderId: number) => {
    if (Capacitor.isNativePlatform()) {
      const verified = localStorage.getItem('werkit_bg_loc_verified');
      if (verified !== 'true') {
        setPendingOrderId(orderId);
        setShowGpsWarning(true);
        return;
      }
    }
    handleAcceptOrder(orderId);
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
      } else alert(dict.errSaveNote);
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
      } else alert(dict.errCancel);
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
      } else alert(dict.errArrived);
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
        <PendingOrdersList 
          workOrders={workOrders}
          overdueOrder={overdueOrder}
          upcomingOrder={upcomingOrder}
          currentUser={currentUser}
          dict={dict}
          requestAcceptOrder={requestAcceptOrder}
          fetchSessionAndPath={fetchSessionAndPath}
        />
      ) : (
        <ActiveSessionDashboard 
          session={session}
          dict={dict}
          adminDict={adminDict}
          isTimeOverrun={isTimeOverrun}
          gpsStatus={gpsStatus}
          traveledKm={traveledKm}
          destination={destination}
          distanceToDestKm={distanceToDestKm}
          location={location}
          pathTraveled={pathTraveled}
          timelineEvents={timelineEvents}
          isTimelineOpen={isTimelineOpen}
          setIsTimelineOpen={setIsTimelineOpen}
          selectedEventId={selectedEventId}
          setSelectedEventId={setSelectedEventId}
          setNoteText={setNoteText}
          setEditingNoteId={setEditingNoteId}
          setIsNotesModalOpen={setIsNotesModalOpen}
          handlePhotoUpload={handlePhotoUpload}
          handleCheckpoint={handleCheckpoint}
          isCancelWindowOpen={isCancelWindowOpen}
          handleCancelSession={handleCancelSession}
          handleEndSession={handleEndSession}
          settings={settings}
          setDistanceToDestKm={setDistanceToDestKm}
        />
      )}

      <NotesModal 
        isNotesModalOpen={isNotesModalOpen}
        setIsNotesModalOpen={setIsNotesModalOpen}
        dict={dict}
        noteText={noteText}
        setNoteText={setNoteText}
        isSubmittingNote={isSubmittingNote}
        handleSaveNote={handleSaveNote}
        editingNoteId={editingNoteId}
        setEditingNoteId={setEditingNoteId}
        timelineEvents={timelineEvents}
      />

      <GpsWarningModal 
        showGpsWarning={showGpsWarning}
        setShowGpsWarning={setShowGpsWarning}
        pendingOrderId={pendingOrderId}
        setPendingOrderId={setPendingOrderId}
        handleAcceptOrder={handleAcceptOrder}
      />

      <div className="mt-4 text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-widest opacity-60">
        Werkit v{process.env.APP_VERSION || '0.0.0'}
      </div>
    </div>
  );
}


