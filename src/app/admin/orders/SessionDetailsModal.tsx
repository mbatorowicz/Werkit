"use client";

import { useEffect, useState } from "react";
import { X, Map as MapIcon, Image as ImageIcon, FileText } from "lucide-react";
import dynamic from "next/dynamic";
import { getDictionary } from "@/i18n";

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg flex items-center justify-center"><MapIcon className="w-8 h-8 text-zinc-400" /></div>
});

export default function SessionDetailsModal({ item, onClose, onEdit }: { item: any, onClose: () => void, onEdit?: (item: any) => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const dict = getDictionary().admin.orders;

  useEffect(() => {
    if (item._type === 'SESSION') {
      setIsLoading(true);
      fetch(`/api/admin/work-sessions/${item.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.logs) setLogs(data.logs);
          if (data.photos) setPhotos(data.photos);
          if (data.notes) setNotes(data.notes);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [item]);

  const pathTraveled = logs.map(l => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) })).reverse();
  const events = [
    ...photos.filter(p => p.latitude && p.longitude).map(p => ({ lat: parseFloat(p.latitude), lng: parseFloat(p.longitude), label: p.photoType === 'START' ? dict.start : (p.photoType === 'END' ? dict.end : dict.photo), id: `photo_${p.id}`, photoUrl: p.photoUrl, type: 'photo' as const })),
    ...notes.filter(n => n.latitude && n.longitude).map(n => ({ lat: parseFloat(n.latitude), lng: parseFloat(n.longitude), label: dict.note, id: `note_${n.id}`, note: n.note, type: 'note' as const }))
  ];
  const hasMapData = logs.length > 0 || events.length > 0;
  const currentLocation = logs.length > 0 ? pathTraveled[pathTraveled.length - 1] : (events.length > 0 ? events[events.length - 1] : { lat: 52.2297, lng: 21.0122 });

  const timelineItems = [...photos.map(p => ({ ...p, type: 'photo', time: new Date(p.createdAt).getTime() })), ...notes.map(n => ({ ...n, type: 'note', time: new Date(n.createdAt).getTime() }))].sort((a, b) => b.time - a.time);
  const allPhotos = timelineItems.filter(entry => entry.type === 'photo').map(p => p.photoUrl);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
       <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-4xl rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80 sticky top-0">
             <div>
               <h2 className="text-3xl font-black text-amber-600 dark:text-amber-500 mb-2">{dict.orderNumber.replace('{id}', item.workOrderId || item.id)}</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400 mt-4 bg-white dark:bg-zinc-800/50 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                 <p><span className="font-semibold text-zinc-900 dark:text-zinc-300">{dict.worker}</span> {item.workerName || dict.noWorkerAssigned}</p>
                 
                 <p><span className="font-semibold text-zinc-900 dark:text-zinc-300">{dict.equipment}</span> {item.sessionType === 'TRANSPORT' ? dict.transport : (item.sessionType === 'MACHINE_OP' ? dict.machineOp : dict.workshop)} {item.resourceName ? `- ${item.resourceName}` : ''}</p>
                 
                 {(item.materialName || item.quantityTons) && (
                   <p><span className="font-semibold text-zinc-900 dark:text-zinc-300">{dict.materialAndQuantity}</span> {item.materialName || ''} {item.quantityTons ? `(${item.quantityTons}${dict.tons})` : ''}</p>
                 )}
                 
                 {(item.customerFirstName || item.customerLastName) && (
                   <p><span className="font-semibold text-zinc-900 dark:text-zinc-300">{dict.customer}</span> {item.customerFirstName || ''} {item.customerLastName || ''}</p>
                 )}

                 {item.taskDescription && (
                   <p className="sm:col-span-2"><span className="font-semibold text-zinc-900 dark:text-zinc-300">{dict.taskDescLabel}</span> {item.taskDescription}</p>
                 )}

                 {(item.startTime || item.dueDate) && (
                   <p className="sm:col-span-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs flex items-center gap-2">
                     <span className="font-semibold text-zinc-900 dark:text-zinc-300">{item.startTime ? dict.startedAt : dict.plannedFor}</span> 
                     <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded">
                       {item.startTime ? new Date(item.startTime).toLocaleString('pl-PL') : new Date(item.dueDate).toLocaleString('pl-PL')}
                     </span>
                   </p>
                 )}
               </div>
             </div>
             <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-2"><X className="w-5 h-5"/></button>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
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
                          {timelineItems.map((entry: any, index) => {
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
                                      <p className="text-sm text-zinc-900 dark:text-zinc-200 whitespace-pre-wrap">{entry.note}</p>
                                    ) : (
                                      <>
                                        <img 
                                          src={entry.photoUrl} 
                                          alt={dict.photoRoute} 
                                          className="w-full h-auto rounded-md mb-2 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                                          onClick={() => setLightboxIndex(allPhotos.indexOf(entry.photoUrl))}
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
              <img 
                 src={allPhotos[lightboxIndex]} 
                 alt={dict.enlargedPhoto} 
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
                 <img 
                   key={idx}
                   src={url}
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
