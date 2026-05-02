"use client";

import { useEffect, useState } from "react";
import { X, Map as MapIcon, Image as ImageIcon, FileText } from "lucide-react";
import dynamic from "next/dynamic";

const LiveMap = dynamic(() => import("@/components/Map/LiveMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-lg flex items-center justify-center"><MapIcon className="w-8 h-8 text-zinc-400" /></div>
});

export default function SessionDetailsModal({ item, onClose }: { item: any, onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (item._type === 'SESSION') {
      setIsLoading(true);
      fetch(`/api/admin/work-sessions/${item.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.logs) setLogs(data.logs);
          if (data.photos) setPhotos(data.photos);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [item]);

  const hasMapData = logs.length > 0;
  const pathTraveled = logs.map(l => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) })).reverse(); // oldest to newest for path
  const currentLocation = hasMapData ? pathTraveled[pathTraveled.length - 1] : { lat: 52.2297, lng: 21.0122 }; // fallback to Warsaw
  
  const events = photos.filter(p => p.latitude && p.longitude).map(p => ({
    lat: parseFloat(p.latitude),
    lng: parseFloat(p.longitude),
    label: p.photoType === 'AD_HOC' ? 'Notatka/Zdjęcie' : (p.photoType === 'START' ? 'Start' : 'Koniec')
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
       <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 w-full max-w-4xl rounded-lg shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-zinc-50 dark:bg-[#0a0a0b]/80 sticky top-0">
             <div>
               <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Szczegóły: {item.workerName}</h2>
               <p className="text-sm text-zinc-500">{item.sessionType === 'TRANSPORT' ? 'Transport' : (item.sessionType === 'MACHINE_OP' ? 'Praca Maszyną' : 'Warsztat')} - {item.resourceName || 'Brak maszyny'}</p>
             </div>
             <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white p-2"><X className="w-5 h-5"/></button>
          </div>
          
          <div className="overflow-y-auto custom-scrollbar flex-1 p-6">
            {item._type === 'ORDER' ? (
              <div className="text-center py-12">
                <MapIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-zinc-900 dark:text-zinc-300 font-medium">Zlecenie jeszcze nierozpoczęte</h3>
                <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto">To zlecenie ma status oczekującego. Mapa i zdjęcia będą dostępne po rozpoczęciu pracy przez pracownika.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="text-center py-12 text-zinc-500">Ładowanie danych z trasy...</div>
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
                           <p>Brak danych GPS dla tego zlecenia.</p>
                         </div>
                       )}
                    </div>

                    {photos.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-amber-500" /> Zdjęcia i Notatki
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {photos.map(photo => (
                            <div key={photo.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-800/50">
                              {photo.photoUrl.startsWith('data:') ? (
                                <img src={photo.photoUrl} alt="Zdjęcie z trasy" className="w-full h-48 object-cover" />
                              ) : (
                                <div className="w-full h-48 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400">
                                  <FileText className="w-8 h-8 mb-2" />
                                </div>
                              )}
                              <div className="p-3">
                                <div className="text-xs text-zinc-500 mb-1">
                                  {new Date(photo.createdAt).toLocaleString('pl-PL')}
                                </div>
                                <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                  {photo.photoType === 'START' ? 'Rozpoczęcie' : photo.photoType === 'END' ? 'Zakończenie' : 'Notatka z trasy'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
       </div>
    </div>
  );
}
