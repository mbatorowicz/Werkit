"use client";

import { useState, useEffect } from "react";
import { Play, Square, Loader2, Clock, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Session = {
  id: number;
  startTime: string;
  sessionType: string;
  status: string;
};

export default function WorkerClient() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [elapsed, setElapsed] = useState("00:00:00");
  const router = useRouter();

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/worker/session");
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
      } else {
        setSession(null);
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSession();
  }, []);

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

  const handleEndSession = async () => {
    if (!confirm("Czy na pewno chcesz zakończyć obecną zmianę/pracę?")) return;
    setIsLoading(true);
    try {
      await fetch("/api/worker/session", { method: "PUT" });
      await fetchSession();
    } catch (e) {
      alert("Błąd zakończenia sesji.");
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
    <div className="flex flex-col items-center justify-center min-h-[70vh] py-8">
      {!session ? (
         <div className="w-full flex flex-col items-center">
            <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mb-8 shadow-inner">
               <Clock className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Gotowy do startu?</h2>
            <p className="text-zinc-500 text-center mb-10 text-sm max-w-[250px]">
              Nie masz obecnie aktywnej sesji pracy. Rozpocznij nowe zlecenie.
            </p>
            
            <Link href="/worker/wizard" className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-5 px-6 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]">
               <Play className="w-6 h-6 fill-current" />
               <span className="text-lg font-bold uppercase tracking-wider">Rozpocznij Pracę</span>
            </Link>
         </div>
      ) : (
         <div className="w-full flex flex-col items-center">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-8 animate-pulse">
               Sesja Aktywna
            </div>

            <div className="font-mono text-6xl md:text-7xl font-bold text-white tracking-tighter mb-4 drop-shadow-md">
               {elapsed}
            </div>

            <div className="text-zinc-400 text-sm font-medium mb-12 uppercase tracking-widest">
               {session.sessionType === 'TRANSPORT' ? 'Trasa Transportowa' : session.sessionType === 'MACHINE_OP' ? 'Praca Sprzętem' : 'Praca na Warsztacie'}
            </div>

            <button onClick={handleEndSession} className="w-full max-w-sm bg-red-600 hover:bg-red-500 text-white rounded-2xl py-5 px-6 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_0_40px_-10px_rgba(220,38,38,0.4)]">
               <Square className="w-6 h-6 fill-current" />
               <span className="text-lg font-bold uppercase tracking-wider">Zakończ Pracę</span>
            </button>
            
            <div className="mt-8 flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
               <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
               <p className="text-xs text-amber-500/90 leading-relaxed">
                 Pamiętaj, aby przed zakończeniem trasy zrobić wymagane zdjęcia, jeśli zostałeś o to poproszony przez dyspozytora.
               </p>
            </div>
         </div>
      )}
    </div>
  );
}
