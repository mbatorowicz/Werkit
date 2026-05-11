"use client";

import { TimelineItem } from "@/types/worker";
import { useEffect, useState } from "react";
import { X, Map as MapIcon, Image as ImageIcon, FileText, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { getDictionary } from "@/i18n";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg flex items-center justify-center"><MapIcon className="w-8 h-8 text-zinc-400" /></div>
});

import { UnifiedGanttItem } from "@/types/admin";

export default function SessionDetailsModal({
  item,
  onClose,
  onEdit,
  canMutate,
  onForceCompleteSession,
  onDeleteArchivedSession,
}: {
  item: UnifiedGanttItem;
  onClose: () => void;
  onEdit?: (item: UnifiedGanttItem) => void;
  canMutate?: boolean;
  onForceCompleteSession?: (sessionId: number) => Promise<void>;
  onDeleteArchivedSession?: (sessionId: number) => Promise<void>;
}) {
  const [logs, setLogs] = useState<{ latitude?: string; longitude?: string }[]>([]);
  const [photos, setPhotos] = useState<{ id?: number; latitude?: string | null; longitude?: string | null; photoUrl?: string; photoType?: string; createdAt?: string }[]>([]);
  const [notes, setNotes] = useState<{ id?: number; latitude?: string | null; longitude?: string | null; note?: string; createdAt?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<null | "complete" | "delete">(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const dict = getDictionary().admin.orders;

  useEffect(() => {
    if (item._type !== "SESSION") return;
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      try {
        const r = await fetch(`/api/admin/work-sessions/${item.id}`);
        const data = (await r.json()) as {
          logs?: { latitude?: string; longitude?: string }[];
          photos?: { id?: number; latitude?: string | null; longitude?: string | null; photoUrl?: string; photoType?: string; createdAt?: string }[];
          notes?: { id?: number; latitude?: string | null; longitude?: string | null; note?: string; createdAt?: string }[];
        };
        if (cancelled) return;
        if (data.logs) setLogs(data.logs);
        if (data.photos) setPhotos(data.photos);
        if (data.notes) setNotes(data.notes);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    queueMicrotask(() => void run());
    return () => {
      cancelled = true;
    };
  }, [item]);

  const pathTraveled = logs
    .filter(
      (l): l is { latitude: string; longitude: string } =>
        typeof l.latitude === "string" &&
        typeof l.longitude === "string" &&
        l.latitude !== "" &&
        l.longitude !== "",
    )
    .map((l) => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) }))
    .reverse();
  const events: TimelineItem[] = [
    ...photos
      .filter((p): p is typeof p & { latitude: string; longitude: string } =>
        Boolean(p.latitude && p.longitude))
      .map((p) => ({
        lat: parseFloat(p.latitude),
        lng: parseFloat(p.longitude),
        id: `photo_${p.id ?? ""}`,
        content: p.photoUrl ?? "",
        type: "photo" as const,
        createdAt: p.createdAt ?? "",
      })),
    ...notes
      .filter((n): n is typeof n & { latitude: string; longitude: string; note: string } =>
        Boolean(n.latitude && n.longitude && n.note))
      .map((n) => ({
        lat: parseFloat(n.latitude),
        lng: parseFloat(n.longitude),
        id: `note_${n.id ?? ""}`,
        content: n.note,
        type: "note" as const,
        createdAt: n.createdAt ?? "",
      })),
  ];
  const hasMapData = logs.length > 0 || events.length > 0;
  const currentLocation = logs.length > 0 ? pathTraveled[pathTraveled.length - 1] : (events.length > 0 ? events[events.length - 1] : { lat: 52.2297, lng: 21.0122 });

  const timelineItems = [...photos.map(p => ({ ...p, type: 'photo' as const, time: new Date(p.createdAt ?? 0).getTime() })), ...notes.map(n => ({ ...n, type: 'note' as const, time: new Date(n.createdAt ?? 0).getTime() }))].sort((a, b) => b.time - a.time);
  const allPhotos = timelineItems
    .filter((entry): entry is typeof entry & { photoUrl: string } => entry.type === "photo" && typeof entry.photoUrl === "string")
    .map((p) => p.photoUrl);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
       <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-4xl rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80 shrink-0 z-20">
             <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Podgląd</h2>
             <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"><X className="w-5 h-5"/></button>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0 p-6">
            <OrderLabelCard
              tone={item.status === "IN_PROGRESS" ? "active" : item.status === "COMPLETED" ? "done" : "planned"}
              orderNo={`#${item.workOrderId || item.id}`}
              mode={(item.categoryName as string) || "Brak kategorii"}
              machine={(item.resourceName as string) || "—"}
              material={(item.materialName as string) || null}
              quantity={item.quantityTons ? `${item.quantityTons as string}${dict.tons}` : null}
              customer={
                `${(item.customerLastName as string) || ""} ${(item.customerFirstName as string) || ""}`.trim() || null
              }
              description={(item.taskDescription as string) || null}
              dateLabel={
                item.startTime
                  ? new Date(item.startTime as string).toLocaleDateString("pl-PL")
                  : item.dueDate
                    ? new Date(item.dueDate as string).toLocaleDateString("pl-PL")
                    : null
              }
              timeLabel={
                item.startTime
                  ? `${new Date(item.startTime as string).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}${
                      item.endTime
                        ? ` – ${new Date(item.endTime as string).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}`
                        : ""
                    }`
                  : item.dueDate
                    ? new Date(item.dueDate as string).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
                    : null
              }
              className="mb-6"
            />
            {item._type === 'ORDER' ? (
              <div className="text-center py-12">
                <MapIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-zinc-900 dark:text-zinc-300 font-medium">{dict.notStartedTitle}</h3>
                <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">{dict.notStartedDesc}</p>
                {onEdit && (
                  <button onClick={() => onEdit(item)} className="mt-6 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/20 px-6 py-2.5 rounded-lg font-semibold transition active:scale-95">
                    Edytuj to zlecenie
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="text-center py-12 text-zinc-500">{dict.loadingData}</div>
                ) : (
                  <>
                    <div className="h-[400px] rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
                       {hasMapData ? (
                         <LiveMap 
                           currentLocation={currentLocation} 
                           pathTraveled={pathTraveled} 
                           destination={null} 
                           events={events} 
                         />
                       ) : (
                         <div className="w-full h-full bg-zinc-50 dark:bg-zinc-800/50 flex flex-col items-center justify-center text-zinc-500">
                           <MapIcon className="w-8 h-8 mb-2 opacity-50" />
                           <p>{dict.noGpsData}</p>
                         </div>
                       )}
                    </div>

                    {timelineItems.length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-amber-500" /> {dict.timelineTitle}
                        </h3>
                        <div className="relative border-l-2 border-zinc-200 dark:border-zinc-800 ml-4 space-y-8">
                          {timelineItems.map((entry) => {
                            const isNote = entry.type === 'note';
                            const timeStr = new Date(entry.time).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
                            const dateStr = new Date(entry.time).toLocaleDateString('pl-PL');
                            
                            return (
                              <div key={`${entry.type}-${entry.id}`} className="relative flex items-start w-full">
                                <div className="absolute -left-[9px] top-4 w-4 h-4 rounded-full bg-amber-500 border-4 border-zinc-50 dark:border-[#0a0a0b] z-10"></div>
                                
                                <div className="w-full pl-6">
                                  <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm max-w-2xl">
                                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2 font-medium">
                                      {isNote ? <FileText className="w-4 h-4 text-orange-500" /> : <ImageIcon className="w-4 h-4 text-purple-500" />}
                                      {dateStr} {timeStr}
                                    </div>
                                    {isNote ? (
                                      <p className="text-sm text-zinc-900 dark:text-zinc-200 whitespace-pre-wrap">{entry.note ?? ""}</p>
                                    ) : (
                                      <>
                                        <Image
                                          src={entry.photoUrl ?? ""}
                                          alt={dict.photoRoute}
                                          width={800}
                                          height={600}
                                          unoptimized
                                          className="w-full h-auto rounded-md mb-2 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => {
                                            const url = entry.photoUrl;
                                            if (!url) return;
                                            setLightboxIndex(allPhotos.indexOf(url));
                                          }}
                                        />
                                        <p className="text-sm text-zinc-900 dark:text-zinc-200 font-medium">
                                          {entry.photoType === 'START' ? dict.photoStart : entry.photoType === 'END' ? dict.photoEnd : dict.photoRoute}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {item._type === "SESSION" && canMutate && (
            <div className="border-t border-zinc-200 dark:border-zinc-700 px-6 py-4 bg-zinc-50 dark:bg-[#0a0a0b]/90 shrink-0 flex flex-wrap gap-2 justify-end">
              {item.status === "IN_PROGRESS" && onForceCompleteSession && (
                <button
                  type="button"
                  disabled={actionBusy !== null}
                  onClick={async () => {
                    if (!dict.forceCompleteConfirm || !confirm(dict.forceCompleteConfirm)) return;
                    setActionBusy("complete");
                    try {
                      await onForceCompleteSession(item.id);
                    } catch {
                      /* alert po stronie rodzica */
                    } finally {
                      setActionBusy(null);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition disabled:opacity-50 border border-emerald-500/30"
                >
                  {actionBusy === "complete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {dict.forceCompleteLabel}
                </button>
              )}
              {item.status === "COMPLETED" && onDeleteArchivedSession && (
                <button
                  type="button"
                  disabled={actionBusy !== null}
                  onClick={async () => {
                    if (!dict.deleteArchivedConfirm || !confirm(dict.deleteArchivedConfirm)) return;
                    setActionBusy("delete");
                    try {
                      await onDeleteArchivedSession(item.id);
                    } catch {
                      /* alert po stronie rodzica */
                    } finally {
                      setActionBusy(null);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/25 hover:bg-red-500/15 transition disabled:opacity-50"
                >
                  {actionBusy === "delete" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {dict.deleteArchivedLabel}
                </button>
              )}
            </div>
          )}
       </div>
       
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col backdrop-blur-md">
           <div className="flex justify-between items-center p-4 text-white/50 z-10">
              <div className="font-medium text-sm tracking-widest">{lightboxIndex + 1} / {allPhotos.length}</div>
              <button onClick={() => setLightboxIndex(null)} className="hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition">
                 <X className="w-6 h-6" />
              </button>
           </div>
           
           <div className="flex-1 flex items-center justify-center relative overflow-hidden px-12">
              <Image
                 src={allPhotos[lightboxIndex]}
                 alt={dict.enlargedPhoto}
                 width={1200}
                 height={900}
                 unoptimized
                 className="max-w-full max-h-full object-contain animate-in fade-in zoom-in-95 duration-300 shadow-2xl"
              />
              
              {allPhotos.length > 1 && (
                <>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev! > 0 ? prev! - 1 : allPhotos.length - 1); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition backdrop-blur-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(prev => prev! < allPhotos.length - 1 ? prev! + 1 : 0); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition backdrop-blur-md"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </>
              )}
           </div>
           
           <div className="h-24 flex items-center justify-center gap-2 p-4 overflow-x-auto bg-black/50 z-10 custom-scrollbar">
              {allPhotos.map((url, idx) => (
                 <Image
                   key={url}
                   src={url}
                   alt=""
                   width={64}
                   height={64}
                   unoptimized
                   className={`h-16 w-16 object-cover rounded cursor-pointer transition-all ${idx === lightboxIndex ? 'border-2 border-amber-500 opacity-100 scale-110' : 'opacity-40 hover:opacity-100'}`}
                   onClick={() => setLightboxIndex(idx)}
                 />
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
