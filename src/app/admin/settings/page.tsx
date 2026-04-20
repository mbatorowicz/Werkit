export default function SettingsPage() {
  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Ustawienia Firmy</h1>
        <p className="text-zinc-500 mt-1">Zdefiniuj ustawienia centralne aplikacji, w tym nazwę i bazę domyślną GPS.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-950/50">
          <h2 className="font-semibold text-white">Konfiguracja Główna</h2>
        </div>
        
        <form className="p-6 space-y-6">
           <div className="space-y-2">
             <label className="text-sm font-medium text-zinc-300">Nazwa wyświetlana firmy</label>
             <input type="text" defaultValue="Margaz" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition outline-none" />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-sm font-medium text-zinc-300">Baza Startowa - Długość GPS (X)</label>
                 <input type="text" defaultValue="22.015" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-400 outline-none" />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium text-zinc-300">Baza Startowa - Szerokość GPS (Y)</label>
                 <input type="text" defaultValue="52.401" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-400 outline-none" />
              </div>
           </div>

           <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 text-amber-500 text-sm mt-4">
              <p>📍 Opcja klikania palcem na mini-mapie, aby automatycznie zaczytać GPS pod te okienka, zostanie tu dodana lada moment!</p>
           </div>
           
           <div className="pt-4 border-t border-zinc-800 flex justify-end">
             <button type="button" className="bg-white text-black font-semibold px-6 py-2.5 rounded-lg hover:bg-zinc-200 transition">Zapisz ustawienia</button>
           </div>
        </form>
      </div>
    </div>
  )
}
