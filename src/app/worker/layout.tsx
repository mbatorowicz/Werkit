import { Map, Clock, User, LogOut } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { companySettings } from "@/db/schema";

export const dynamic = 'force-dynamic';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const settings = await db.select().from(companySettings).limit(1);
  const companyName = settings[0]?.companyName || "Werkit ERP";

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      <header className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/50 bg-[#0a0a0b] sticky top-0 z-50">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight leading-tight">{companyName}</h1>
          <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase">Portal Pracowniczy</p>
        </div>
        <Link href="/login" className="p-2 text-zinc-500 hover:text-white transition-colors">
           <LogOut className="w-5 h-5" />
        </Link>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto p-4">
        {children}
      </main>

      <nav className="h-16 border-t border-zinc-800/50 bg-[#0a0a0b] flex items-center justify-around sticky bottom-0 z-50 pb-safe">
        <Link href="/worker" className="flex flex-col items-center justify-center text-zinc-400 hover:text-emerald-500 transition-colors flex-1 h-full gap-1">
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Sesja</span>
        </Link>
        <Link href="/worker/history" className="flex flex-col items-center justify-center text-zinc-400 hover:text-amber-500 transition-colors flex-1 h-full gap-1">
          <Map className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Historia</span>
        </Link>
        <Link href="/worker/profile" className="flex flex-col items-center justify-center text-zinc-400 hover:text-white transition-colors flex-1 h-full gap-1">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Profil</span>
        </Link>
      </nav>
    </div>
  );
}
