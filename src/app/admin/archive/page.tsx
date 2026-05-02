import { Search } from "lucide-react";

export default function ArchivePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-white">Historia Działań</h1>
        <p className="text-zinc-500 mt-1">Przeglądaj wszystkie archiwalne sesje pracy we flocie i warsztacie.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex-1 flex flex-col overflow-hidden shadow-sm">
        {/* Pasek filtrowania */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-4 bg-zinc-50 dark:bg-[#0a0a0b]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Szukaj po operatorze lub maszynie..." 
              className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition outline-none"
            />
          </div>
          <button className="text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2 rounded-lg transition font-medium">
             Wybierz Okres
          </button>
        </div>

        {/* Placeholder dla Tabeli z bazy danych */}
        <div className="flex-1 p-8 flex flex-col justify-center items-center text-center bg-zinc-100 dark:bg-zinc-950/50">
           <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center mb-4 shadow-inner">
             <Search className="w-6 h-6 text-zinc-600" />
           </div>
           <h3 className="text-zinc-900 dark:text-zinc-200 font-medium">Brak zsynchronizowanej historii</h3>
           <p className="text-zinc-500 text-sm mt-2 max-w-sm">Pracownicy jeszcze nie wykonali synchronizacji i nie przesłali danych z aplikacji mobilnej do platformy Vercel.</p>
        </div>
      </div>
    </div>
  );
}




