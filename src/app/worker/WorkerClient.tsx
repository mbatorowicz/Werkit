"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square, Loader2, Clock, AlertTriangle, Navigation, MapPin, Camera, FileText, X, History } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Capacitor, registerPlugin } from '@capacitor/core';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), { ssr: false, loading: () => <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500"/></div> });

type Session = {
  id: number;
  startTime: string;
  sessionType: string;
  status: string;
  customerAddress?: string;
  customerLat?: string;
  customerLng?: string;
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

// Haversine formula for distance between coords in meters
function getDistance(a: Coord, b: Coord) {
  const R = 6371e3; // metres
  const φ1 = a.lat * Math.PI/180;
  const φ2 = b.lat * Math.PI/180;
  const Δφ = (b.lat-a.lat) * Math.PI/180;
  const Δλ = (b.lng-a.lng) * Math.PI/180;

  const x = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
  return R * c;
}

export default function WorkerClient() {
  const [events, setEvents] = useState<{lat: number, lng: number, label: string}[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsed, setElapsed] = useState("00:00:00");
  
  const [location, setLocation] = useState<Coord | null>(null);
  const [pathTraveled, setPathTraveled] = useState<Coord[]>([]);
  const [destination, setDestination] = useState<Coord | null>(null);
  const [distanceToDestKm, setDistanceToDestKm] = useState<number | null>(null);
  const [traveledKm, setTraveledKm] = useState(0);
  
  const [gpsStatus, setGpsStatus] = useState<"waiting"|"active"|"error">("waiting");
  const router = useRouter();
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
                 dist += getDistance(pathData.logs[i-1], pathData.logs[i]);
              }
              setTraveledKm(dist / 1000);
           }
         } catch(e) {}
      }

      if (sessData.session) {
        setSession(sessData.session);
        const newEvents: {lat: number, lng: number, label: string}[] = [];
        if (sessData.events) {
           sessData.events.forEach((ev: any) => {
              if (ev.latitude && ev.longitude) newEvents.push({ lat: parseFloat(ev.latitude), lng: parseFloat(ev.longitude), label: 'Zdjęcie' });
           });
        }
        if (sessData.session.taskDescription) {
           const regex = /\(GPS: ([\d.-]+), ([\d.-]+)\)/g;
           let match;
           while ((match = regex.exec(sessData.session.taskDescription)) !== null) {
              newEvents.push({ lat: parseFloat(match[1]), lng: parseFloat(match[2]), label: 'Notatka' });
           }
        }
        setEvents(newEvents);

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
           } catch(e){ console.error("Geocode fail") }
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
    fetchSessionAndPath(true, true);
    const interval = setInterval(() => fetchSessionAndPath(false, false), 10000);
    return () => clearInterval(interval);
  }, []);

  // Timer Logic
  useEffect(() => {
    if (!session) return;
    const start = new Date(session.startTime).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = now - start;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  // GPS & Wake Lock Logic
  useEffect(() => {
    if (!session) {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
        wakeLockRef.current = null;
      }
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    };
    requestWakeLock();

    const handleNewLoc = (newLoc: Coord) => {
      setLocation(newLoc);
      
      setPathTraveled(prev => {
         const updated = [...prev, newLoc];
         let dist = 0;
         for (let i = 1; i < updated.length; i++) {
            dist += getDistance(updated[i-1], updated[i]);
         }
         setTraveledKm(dist / 1000);
         return updated;
      });

      const payload = { ...newLoc, timestamp: new Date().toISOString() };
      let queue: any[] = [];
      try { queue = JSON.parse(localStorage.getItem('werkit_gps_queue') || '[]'); } catch(e){}
      queue.push(payload);
      
      if (navigator.onLine) {
        fetch("/api/worker/gps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queue)
        })
        .then(res => {
           if (res.ok) {
             localStorage.setItem('werkit_gps_queue', '[]');
             setGpsStatus("active");
           } else {
             localStorage.setItem('werkit_gps_queue', JSON.stringify(queue));
           }
        })
        .catch(() => {
           localStorage.setItem('werkit_gps_queue', JSON.stringify(queue));
           setGpsStatus("waiting");
        });
      } else {
        localStorage.setItem('werkit_gps_queue', JSON.stringify(queue));
        setGpsStatus("waiting");
      }
    };

    if (Capacitor.isNativePlatform()) {
      setGpsStatus("waiting");
      BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: "Aplikacja śledzi trasę pracownika.",
          backgroundTitle: "Werkit - Rejestrowanie trasy",
          requestPermissions: true,
          stale: false,
          distanceFilter: 10
        },
        function callback(location, error) {
          if (error) {
            setGpsStatus("error");
            return;
          }
          if (location) {
             handleNewLoc({ lat: location.latitude, lng: location.longitude, heading: location.bearing });
          }
        }
      ).then(watcherId => {
         watchIdRef.current = watcherId;
      });
    } else if ("geolocation" in navigator) {
      setGpsStatus("waiting");
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          handleNewLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, heading: pos.coords.heading });
        },
        (err) => {
          setGpsStatus("error");
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } else {
      setGpsStatus("error");
    }

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.error);
        wakeLockRef.current = null;
      }
      if (watchIdRef.current !== null) {
        if (Capacitor.isNativePlatform()) {
          BackgroundGeolocation.removeWatcher({ id: watchIdRef.current });
        } else {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
    };
  }, [session]);

  const handleEndSession = async () => {
    if (!confirm("Czy na pewno chcesz zakończyć obecną zmianę/pracę?")) return;
    setIsLoading(true);
    try {
      await fetch("/api/worker/session", { method: "PUT" });
      await fetchSessionAndPath();
    } catch (e) {
      alert("Błąd zakończenia sesji.");
      setIsLoading(false);
    }
  };



  const handleAcceptOrder = async (orderId: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/worker/work-orders/${orderId}/accept`, { method: "POST" });
      if(res.ok) {
        await fetchSessionAndPath();
      } else {
        alert("Błąd akceptacji zlecenia.");
        setIsLoading(false);
      }
    } catch (e) {
      alert("Błąd sieci.");
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
          alert("Zdjęcie zoptymalizowane i zapisane pomyślnie!");
        } else {
          alert("Błąd zapisu zdjęcia.");
        }
      } catch (err) {
        alert("Błąd przetwarzania zdjęcia.");
      }
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setIsSubmittingNote(true);
    try {
      const res = await fetch("/api/worker/session/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText, location })
      });
      if(res.ok) {
        alert("Notatka została dopisana do raportu.");
        setIsNotesModalOpen(false);
        setNoteText("");
        fetchSessionAndPath();
      } else {
        alert("Błąd zapisywania notatki.");
      }
    } catch(e) {
      alert("Błąd sieci.");
    }
    setIsSubmittingNote(false);
  };

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
              <button onClick={() => fetchSessionAndPath(true, true)} className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mb-6 shadow-inner cursor-pointer" title="Odśwież listę">
                 <History className="w-10 h-10 text-zinc-700 dark:text-zinc-300" />
              </button>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Gotowy do startu?</h2>
              <p className="text-zinc-500 text-center mb-6 text-sm max-w-[250px]">
                Wybierz przygotowane zlecenie lub rozpocznij pracę ręcznie.
              </p>
            </div>

            {workOrders.length > 0 && (
              <div className="w-full max-w-sm flex flex-col gap-3 mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-2">Oczekujące zlecenia</h3>
                {workOrders.map(order => (
                  <div key={order.id} className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex flex-col gap-3">
                     <div className="flex flex-col">
                       <div className="flex items-start justify-between gap-2 mb-1">
                         <span className="text-sm font-bold text-amber-900 dark:text-amber-500">
                           {order.sessionType === 'TRANSPORT' ? 'Transport' : order.sessionType === 'MACHINE_OP' ? 'Praca Sprzętem' : 'Warsztat'}
                         </span>
                         {order.priority === 'HIGH' && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 shrink-0">
                              <div className="w-2 h-2 rounded-sm bg-red-500 shadow-sm shrink-0" />
                              <span className="text-[10px] font-bold text-red-700 dark:text-red-400">WAŻNY</span>
                            </div>
                         )}
                         {(!order.priority || order.priority === 'NORMAL') && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 shrink-0">
                              <div className="w-2 h-2 rounded-sm bg-orange-500 shadow-sm shrink-0" />
                              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">NORMALNY</span>
                            </div>
                         )}
                         {order.priority === 'LOW' && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
                              <div className="w-2 h-2 rounded-sm bg-emerald-500 shadow-sm shrink-0" />
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">NISKI</span>
                            </div>
                         )}
                       </div>
                       <span className="text-xs text-amber-700 dark:text-amber-600/80 mt-1">
                         Maszyna: <span className="font-semibold">{order.resourceName}</span>
                       </span>
                       {order.sessionType === 'TRANSPORT' && (
                         <span className="text-xs text-amber-700 dark:text-amber-600/80">
                           Kruszywo: <span className="font-semibold">{order.materialName}</span> → {order.customerName}
                         </span>
                       )}
                       {order.sessionType !== 'TRANSPORT' && order.taskDescription && (
                         <span className="text-xs text-amber-700 dark:text-amber-600/80 mt-1">
                           Zadanie: {order.taskDescription}
                         </span>
                       )}
                       {order.dueDate && (
                         <div className="mt-2 flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded w-fit">
                           <Clock className="w-3 h-3" />
                           <span className="text-xs">
                             Termin: {new Date(order.dueDate).toLocaleDateString('pl-PL')} {new Date(order.dueDate).toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'})}
                           </span>
                         </div>
                       )}
                     </div>
                     <button onClick={() => handleAcceptOrder(order.id)} className="bg-amber-600 hover:bg-amber-500 text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm w-full">
                        <Play className="w-4 h-4 fill-current" />
                        <span className="text-sm font-bold uppercase tracking-wider">Rozpocznij to zadanie</span>
                     </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="w-full max-w-sm flex flex-col items-center mt-4">
              <div className="text-zinc-400 text-xs uppercase font-bold tracking-widest mb-4">LUB</div>
              <Link href="/worker/wizard" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-5 px-6 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
                 <Play className="w-6 h-6 fill-current" />
                 <span className="text-lg font-bold uppercase tracking-wider">Zdefiniuj własne</span>
              </Link>
            </div>
         </div>
      ) : (
         <div className="w-full flex flex-col items-center">
            
            {/* WIDGET STATUSU */}
            <div className="w-full flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
               <div>
                  <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Upływ czasu</div>
                  <div className="font-mono text-3xl font-bold text-zinc-900 dark:text-white tracking-tighter">
                     {elapsed}
                  </div>
               </div>
               <div className="text-right">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1.5">Sygnał GPS</div>
                  <div className="flex items-center justify-end gap-1.5">
                     <div className={`w-2 h-2 rounded-full ${gpsStatus === 'active' ? 'bg-emerald-500 animate-pulse' : gpsStatus === 'waiting' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`} />
                     <span className={`text-xs font-bold ${gpsStatus === 'active' ? 'text-emerald-500' : gpsStatus === 'waiting' ? 'text-amber-500' : 'text-red-500'}`}>
                        {gpsStatus === 'active' ? 'ŁĄCZENIE OK' : gpsStatus === 'waiting' ? 'SZUKAM...' : 'BŁĄD'}
                     </span>
                  </div>
               </div>
            </div>

            {/* WIDGET TRASY */}
            <div className="w-full flex gap-4 mt-4">
               <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                  <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Przebyta Trasa</div>
                  <div className="font-mono text-xl font-bold text-emerald-400">{traveledKm.toFixed(1)} <span className="text-sm text-zinc-500">km</span></div>
               </div>
               {destination && distanceToDestKm !== null && (
                 <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
                    <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">Do Celu</div>
                    <div className="font-mono text-xl font-bold text-amber-500">{distanceToDestKm.toFixed(1)} <span className="text-sm text-zinc-500">km</span></div>
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
                   events={events}
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-zinc-700 animate-bounce" />
                 </div>
               )}
               

            </div>

            {/* NOTATKI I ZDJĘCIA */}
            <div className="w-full grid grid-cols-2 gap-4 mt-4">
              <button onClick={() => setIsNotesModalOpen(true)} className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-4 flex flex-col items-center justify-center gap-2 transition-all border border-zinc-200 dark:border-zinc-700">
                 <FileText className="w-6 h-6" />
                 <span className="text-xs font-bold uppercase tracking-wider">Notatki</span>
              </button>
              <label className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg py-4 flex flex-col items-center justify-center gap-2 transition-all border border-zinc-200 dark:border-zinc-700 cursor-pointer">
                 <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                 <Camera className="w-6 h-6" />
                 <span className="text-xs font-bold uppercase tracking-wider">Aparat</span>
              </label>
            </div>

            <div className="mt-6 w-full">
               <button onClick={handleEndSession} className="w-full bg-red-600 hover:bg-red-500 text-white rounded-lg py-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_30px_-10px_rgba(220,38,38,0.4)]">
                  <Square className="w-5 h-5 fill-current" />
                  <span className="font-bold uppercase tracking-wider text-sm">Zakończ Trasę</span>
               </button>
            </div>
         </div>
      )}

      {isNotesModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsNotesModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Dodaj notatkę do raportu</h2>
              <button onClick={() => setIsNotesModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Treść notatki</label>
                <textarea 
                  value={noteText} 
                  onChange={(e) => setNoteText(e.target.value)} 
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none h-32 resize-none"
                  placeholder="Wpisz uwagi, np. problemy z dojazdem, awaria..."
                />
              </div>
              <button disabled={isSubmittingNote} onClick={handleSaveNote} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-3.5 flex items-center justify-center gap-2 font-bold uppercase tracking-wider text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                {isSubmittingNote ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Zapisz Notatkę'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


