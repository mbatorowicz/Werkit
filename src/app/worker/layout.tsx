import { Map, Clock, User, LogOut } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { APP_VERSION } from "@/lib/version";

export const dynamic = 'force-dynamic';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const settings = await db.select().from(companySettings).limit(1);
  const companyName = settings[0]?.companyName || "Werkit ERP";

  return (
    <div className="flex flex-col min-h-screen bg-[#f2fbfa] dark:bg-zinc-900 text-zinc-100">
      <header className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 sticky top-0 z-50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">WERKIT</h1>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">v{APP_VERSION}</span>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest uppercase truncate max-w-[200px]" title={companyName}>{companyName}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
             <LogOut className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto p-4">
        {children}
      </main>

      <nav className="h-16 border-t border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 flex items-center justify-around sticky bottom-0 z-50 pb-safe">
        <Link href="/worker" className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 transition-colors flex-1 h-full gap-1">
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Sesja</span>
        </Link>
        <Link href="/worker/history" className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-amber-500 transition-colors flex-1 h-full gap-1">
          <Map className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Historia</span>
        </Link>
        <Link href="/worker/profile" className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-white transition-colors flex-1 h-full gap-1">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Profil</span>
        </Link>
      </nav>
    </div>
  );
}
