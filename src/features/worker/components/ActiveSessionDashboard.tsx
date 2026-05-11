"use client";

import { useEffect, useState } from "react";
import { Clock, MapPin, Camera, FileText, X, Square, ChevronUp, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Session, Coord, AppSettings, TimelineItem } from "@/types/worker";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), { ssr: false });

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

interface ActiveSessionDashboardProps {
  session: Session;
  /** Kategoria sprzętu „stacjonarna” — uproszczony panel bez mapy trasy i bez pilnowania GPS. */
  isStationarySession?: boolean;
  dict: Record<string, string>;
  adminDict: Record<string, string>;
  isTimeOverrun: boolean;
  gpsStatus: "waiting" | "active" | "error";
  traveledKm: number;
  destination: Coord | null;
  distanceToDestKm: number | null;
  location: Coord | null;
  pathTraveled: Coord[];
  timelineEvents: TimelineItem[];
  isTimelineOpen: boolean;
  setIsTimelineOpen: (val: boolean) => void;
  selectedEventId: string | null;
  setSelectedEventId: (val: string | null) => void;
  setNoteText: (val: string) => void;
  setEditingNoteId: (val: number | null) => void;
  setIsNotesModalOpen: (val: boolean) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckpoint: () => void;
  isCancelWindowOpen: boolean;
  handleCancelSession: () => void;
  handleEndSession: () => void;
  settings: AppSettings | null;
  setDistanceToDestKm: (val: number | null) => void;
}

export default function ActiveSessionDashboard({
  session,
  isStationarySession = false,
  dict,
  adminDict,
  isTimeOverrun,
  gpsStatus,
  traveledKm,
  destination,
  distanceToDestKm,
  location,
  pathTraveled,
  timelineEvents,
  isTimelineOpen,
  setIsTimelineOpen,
  selectedEventId,
  setSelectedEventId,
  setNoteText,
  setEditingNoteId,
  setIsNotesModalOpen,
  handlePhotoUpload,
  handleCheckpoint,
  isCancelWindowOpen,
  handleCancelSession,
  handleEndSession,
  settings,
  setDistanceToDestKm
}: ActiveSessionDashboardProps) {
  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* SZCZEGÓŁY ZLECENIA */}
      <div className="w-full bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 shadow-sm">
        <OrderLabelCard
          tone="active"
          orderNo={session.workOrderId ? `#${session.workOrderId}` : `#${session.id}`}
          mode={session.categoryName || "Brak kategorii"}
          machine={session.resourceName || "—"}
          material={session.materialName}
          quantity={session.quantityTons ? `${session.quantityTons}${adminDict.tons}` : null}
          customer={
            `${session.customerLastName || ""} ${session.customerFirstName || ""}`.trim() ||
            (session.customerAddress ? session.customerAddress : null)
          }
          description={session.taskDescription}
          dateLabel={new Date(session.startTime).toLocaleDateString("pl-PL")}
          timeLabel={`${new Date(session.startTime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} – …`}
        />
      </div>

      {/* WIDGET STATUSU */}
      <div className="w-full flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4">
        <div>
          <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">{dict.timeElapsed}</div>
          <div className="font-mono text-3xl font-bold text-zinc-900 dark:text-white tracking-tighter">
            <SessionTimer startTime={session.startTime} />
          </div>
        </div>
        {isStationarySession ? (
          <div className="max-w-[58%] text-right">
            <div className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-1">{dict.sessionStationaryBadge}</div>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-snug">{dict.sessionStationaryGpsNote}</p>
          </div>
        ) : (
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
        )}
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
      {!isStationarySession && (
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
      )}

      {/* MAPA — ukryta dla trybu stacjonarnego (brak sensu śledzenia trasy na mapie) */}
      {!isStationarySession && (
      <div className="w-full h-64 md:h-80 mt-4 relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-inner bg-white dark:bg-zinc-900">
        {location ? (
          <LiveMap
            currentLocation={location}
            pathTraveled={pathTraveled}
            destination={destination}
            onRouteDistance={(km) => setDistanceToDestKm(km)}
            events={timelineEvents}
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
      )}

      {/* OŚ CZASU */}
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
                        <Image src={item.content} alt="" width={64} height={64} unoptimized className="w-full h-full object-cover" />
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

      {!isStationarySession && (
      <div className="w-full mt-4">
        <button onClick={handleCheckpoint} className="w-full bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg py-4 flex items-center justify-center gap-2 transition-all active:scale-95">
          <MapPin className="w-5 h-5" />
          <span className="font-bold uppercase tracking-wider text-sm">{dict.reportArrived}</span>
        </button>
      </div>
      )}

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
  );
}
