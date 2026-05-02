"use client";

import { useState, useEffect } from "react";
import { Search, Map, Activity } from "lucide-react";

export default function ArchiveClient() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/admin/archive", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        setSessions(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const filteredSessions = sessions.filter(s => 
    (s.workerName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (s.resourceName?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-white">Ewidencja Zleceń</h1>
        <p className="text-zinc-500 mt-1">Przeglądaj wszystkie bieżące oraz archiwalne sesje pracy we flocie i warsztacie.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-4 bg-zinc-50 dark:bg-[#0a0a0b]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj po operatorze lub maszynie..." 
              className="w-full bg-[#f2fbfa] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-900 dark:text-zinc-200 focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition outline-none"
            />
          </div>
          <button className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition font-medium">
             Wybierz Okres
          </button>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#0a0a0b]">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pracownik / Czas</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Maszyna</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Zadanie / Typ</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500 dark:text-zinc-400 text-sm">Pobieranie ewidencji...</td></tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Search className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                      <h3 className="text-zinc-900 dark:text-zinc-300 font-medium">Brak wpisów w ewidencji</h3>
                      <p className="text-zinc-500 text-sm mt-2 max-w-md">Pracownicy jeszcze nie wykonali pracy spełniającej podane kryteria.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSessions.map(session => (
                <tr key={session.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-zinc-900 dark:text-zinc-200">{session.workerName}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {new Date(session.startTime).toLocaleDateString('pl-PL')} {new Date(session.startTime).toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'})}
                      {session.endTime && ` - ${new Date(session.endTime).toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'})}`}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300">
                    {session.resourceName || 'Brak'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-zinc-900 dark:text-zinc-200">
                      {session.sessionType === 'TRANSPORT' ? 'Transport Kruszyw' : (session.sessionType === 'MACHINE_OP' ? 'Praca Sprzętem' : 'Warsztat')}
                    </div>
                    {session.sessionType === 'TRANSPORT' && (
                       <div className="text-xs text-zinc-500 mt-0.5">
                         {session.materialName} → {session.customerLastName} {session.customerFirstName}
                       </div>
                    )}
                    {session.taskDescription && (
                       <div className="text-xs text-zinc-500 mt-0.5 max-w-xs truncate" title={session.taskDescription}>
                         {session.taskDescription}
                       </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${session.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-500 dark:border-blue-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-500 dark:border-emerald-500/20'}`}>
                      {session.status === 'IN_PROGRESS' ? 'W trakcie' : 'Zakończone'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
