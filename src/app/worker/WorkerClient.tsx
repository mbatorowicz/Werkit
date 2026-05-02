"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Square, Loader2, Clock, AlertTriangle, Navigation, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), { ssr: false, loading: () => <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500"/></div> });

type Session = {
  id: number;
  startTime: string;
  sessionType: string;
  status: string;
  customerAddress?: string;
};

type WorkOrder = {
  id: number;
  sessionType: string;
  taskDescription: string | null;
  resourceName: string | null;
  materialName: string | null;
  customerName: string | null;
};

type Coord = { lat: number, lng: number };

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
  
  const wakeLockRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);

  const fetchSessionAndPath = async () => {
    try {
      const [resSess, resPath, resOrders] = await Promise.all([
        fetch("/api/worker/session"),
        fetch("/api/worker/gps"),
        fetch("/api/worker/work-orders")
      ]);
      const sessData = await resSess.json();
      const pathData = await resPath.json();
      const ordersData = await resOrders.json();

      setWorkOrders(Array.isArray(ordersData) ? ordersData : []);
      
      if (sessData.session) {
        setSession(sessData.session);
        if (pathData.logs) {
           setPathTraveled(pathData.logs);
           // calculate traveled
           let dist = 0;
           for (let i = 1; i < pathData.logs.length; i++) {
              dist += getDistance(pathData.logs[i-1], pathData.logs[i]);
           }
           setTraveledKm(dist / 1000);
        }

        // Geocode customer destination if needed
        if (sessData.session.customerAddress && !destination) {
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
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSessionAndPath();
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

    if ("geolocation" in navigator) {
      setGpsStatus("waiting");
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          setGpsStatus("active");
          
          setPathTraveled(prev => {
             const updated = [...prev, newLoc];
             // recalc distance
             let dist = 0;
             for (let i = 1; i < updated.length; i++) {
                dist += getDistance(updated[i-1], updated[i]);
             }
             setTraveledKm(dist / 1000);
             return updated;
          });

          // Send to server quietly
          fetch("/api/worker/gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newLoc)
          }).catch(() => {});
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
        navigator.geolocation.clearWatch(watchIdRef.current);
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
              <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mb-6 shadow-inner">
                 <Clock className="w-10 h-10 text-zinc-700" />
              </div>
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
                       <span className="text-sm font-bold text-amber-900 dark:text-amber-500">
                         {order.sessionType === 'TRANSPORT' ? 'Transport' : order.sessionType === 'MACHINE_OP' ? 'Praca Sprzętem' : 'Warsztat'}
                       </span>
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
                 />
               ) : (
                 <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-zinc-700 animate-bounce" />
                 </div>
               )}
               

            </div>

            <div className="mt-6 w-full">
               <button onClick={handleEndSession} className="w-full bg-red-600 hover:bg-red-500 text-white rounded-lg py-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_30px_-10px_rgba(220,38,38,0.4)]">
                  <Square className="w-5 h-5 fill-current" />
                  <span className="font-bold uppercase tracking-wider text-sm">Zakończ Trasę</span>
               </button>
            </div>
         </div>
      )}
    </div>
  );
}


