import LiveMap from "@/components/Map/LiveMap";

export default function DashboardPage() {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 w-full h-[calc(100vh)] md:h-[calc(100vh)] relative">
        <LiveMap />
        
        {/* Pływający panel (Overlay) na górze mapy z lewej strony */}
        <div className="absolute top-6 left-6 z-10 pointer-events-none hidden sm:block">
          <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl px-6 py-5 shadow-2xl pointer-events-auto min-w-[280px]">
            <h2 className="text-zinc-100 font-medium tracking-tight mb-1 text-lg">Przegląd Floty</h2>
            <div className="flex items-center gap-6 mt-4">
              <div>
                <p className="text-zinc-500 text-xs font-medium">Aktywne sesje maszyn</p>
                <div className="flex items-center gap-2 mt-1.5 align-middle">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
                  <span className="text-zinc-100 font-semibold text-lg">0 / 0</span>
                </div>
              </div>
            </div>
            
            <div className="mt-5 pt-4 border-t border-zinc-800">
               <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold flex justify-between">
                <span>Aktualizacja GPS</span>
                <span className="text-zinc-400">NA ŻYWO</span>
               </p>
            </div>
          </div>
        </div>

        {/* Minimalistyczny floating action button do dodawania zadań (w rogu z prawej) */}
        <div className="absolute bottom-6 right-6 z-10">
            <button className="bg-white hover:bg-zinc-200 text-zinc-950 shadow-xl font-medium rounded-full px-5 py-2.5 text-sm transition-all pointer-events-auto flex gap-2 items-center">
              Podsumowanie dzienne
            </button>
        </div>
      </div>
    </div>
  );
}
