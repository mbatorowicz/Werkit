"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { getDictionary } from "@/i18n";
import { Capacitor } from '@capacitor/core';

import { useWorkerNotifications } from '@/features/worker/hooks/useWorkerNotifications';
import { useWorkerGPS } from '@/features/worker/hooks/useWorkerGPS';
import { GPSManager } from '@/lib/gpsManager';
import { Session, WorkOrder, Coord, AppSettings, UserData, TimelineItem, InitialWorkerData } from "@/types/worker";

import PendingOrdersList from "@/features/worker/components/PendingOrdersList";
import ActiveSessionDashboard from "@/features/worker/components/ActiveSessionDashboard";
import NotesModal from "@/features/worker/components/Modals/NotesModal";
import GpsWarningModal from "@/features/worker/components/Modals/GpsWarningModal";
import { useWorkerActions } from "@/features/worker/hooks/useWorkerActions";

export default function WorkerClient({ initialData }: { initialData: InitialWorkerData | null }) {
  const getInitialTimeline = () => {
    const arr: TimelineItem[] = [];
    if (initialData?.events && Array.isArray(initialData.events)) {
      arr.push(...initialData.events.map(e => ({
        id: `photo_${e.id}`, type: 'photo' as const, content: e.photoUrl || '',
        lat: parseFloat(e.latitude || '0'), lng: parseFloat(e.longitude || '0'), createdAt: new Date(e.createdAt).toISOString()
      })));
    }
    if (initialData?.notes && Array.isArray(initialData.notes)) {
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

  const [settings, setSettings] = useState<AppSettings | null>(initialData?.settings || null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(initialData?.user || null);

  const [location, setLocation] = useState<Coord | null>(null);
  const [pathTraveled, setPathTraveled] = useState<Coord[]>([]);
  const [destination, setDestination] = useState<Coord | null>(null);
  const destinationRef = useRef<Coord | null>(null);
  useEffect(() => {
    destinationRef.current = destination;
  }, [destination]);
  const [distanceToDestKm, setDistanceToDestKm] = useState<number | null>(null);
  const [traveledKm, setTraveledKm] = useState(0);

  const [gpsStatus, setGpsStatus] = useState<"waiting" | "active" | "error">("waiting");
  const dict = getDictionary().worker.client;
  const adminDict = getDictionary().admin.orders;

  const [showGpsWarning, setShowGpsWarning] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);

  const fetchSessionAndPath = useCallback(async (showLoader = true, fetchGpsPath = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const [resSess, resOrders] = await Promise.all([
        fetch("/api/worker/session", { cache: "no-store" }),
        fetch("/api/worker/work-orders", { cache: "no-store" })
      ]);
      
      if (!resSess.ok) throw new Error(`Session fetch failed: ${resSess.status}`);
      if (!resOrders.ok) throw new Error(`Orders fetch failed: ${resOrders.status}`);

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
              dist += GPSManager.getDistance(pathData.logs[i - 1], pathData.logs[i]);
            }
            setTraveledKm(dist / 1000);
          }
        } catch {
          /* ścieżka GPS opcjonalna */
        }
      }

      if (sessData.settings) setSettings(sessData.settings);
      if (sessData.user) setCurrentUser(sessData.user);

      if (sessData.session) {
        setSession(sessData.session);
        const newTimeline: TimelineItem[] = [];
        if (sessData.events && Array.isArray(sessData.events)) {
          newTimeline.push(...sessData.events.map((e: { id: number, photoUrl?: string, latitude?: string, longitude?: string, createdAt: string }) => ({
            id: `photo_${e.id}`, type: 'photo' as const, content: e.photoUrl || '',
            lat: parseFloat(e.latitude || '0'), lng: parseFloat(e.longitude || '0'), createdAt: new Date(e.createdAt).toISOString()
          })));
        }
        if (sessData.notes && Array.isArray(sessData.notes)) {
          newTimeline.push(...sessData.notes.map((n: { id: number, note: string, latitude?: string, longitude?: string, createdAt: string }) => ({
            id: `note_${n.id}`, type: 'note' as const, content: n.note,
            lat: parseFloat(n.latitude || '0'), lng: parseFloat(n.longitude || '0'), createdAt: new Date(n.createdAt).toISOString()
          })));
        }
        newTimeline.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setTimelineEvents(newTimeline);

        if (sessData.session.customerLat && sessData.session.customerLng) {
          setDestination({ lat: parseFloat(sessData.session.customerLat), lng: parseFloat(sessData.session.customerLng) });
        } else if (sessData.session.customerAddress && !destinationRef.current) {
          try {
            const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sessData.session.customerAddress)}`);
            const geoData = await geo.json();
            if (geoData && geoData.length > 0) {
              setDestination({ lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) });
            }
          } catch {
            /* geokodowanie opcjonalne */
          }
        }
      } else {
        setSession(null);
      }
    } catch (e) {
      console.error(e);
    }
    if (showLoader) setIsLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      if (!initialData) void fetchSessionAndPath(true, true);
      else void fetchSessionAndPath(false, true);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchSessionAndPath(false, false);
        GPSManager.flushQueue();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  }, [initialData, fetchSessionAndPath]);

  useWorkerGPS(session, setLocation, setPathTraveled, setTraveledKm, setGpsStatus);

  const {
    isNotesModalOpen, setIsNotesModalOpen,
    noteText, setNoteText,
    isSubmittingNote,
    editingNoteId, setEditingNoteId,
    handleEndSession,
    handleAcceptOrder,
    handleCancelSession,
    handleCheckpoint,
    handleSaveNote,
    handlePhotoUpload
  } = useWorkerActions({
    dict,
    fetchSessionAndPath,
    setIsLoading,
    timelineEvents,
    settings,
    distanceToDestKm
  });

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
          handlePhotoUpload={(e: React.ChangeEvent<HTMLInputElement>) => handlePhotoUpload(e, location)}
          handleCheckpoint={() => handleCheckpoint(location)}
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
        handleSaveNote={() => handleSaveNote(location)}
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


