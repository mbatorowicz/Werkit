import { Map, Users, Package, Activity, LogOut, FileClock, Wrench, HardHat, Settings } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { companySettings } from "@/db/schema";

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Fetch SSOT for sidebar company name
  const settings = await db.select().from(companySettings).limit(1);
  const companyName = settings[0]?.companyName || "Dodaj Nazwę Firmy";

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-zinc-100">
      <aside className="w-64 bg-[#0a0a0b] border-r border-zinc-800 flex flex-col justify-between hidden md:flex z-50">
        <div>
          <div className="h-[72px] flex flex-col justify-center px-6 border-b border-zinc-800">
             <h1 className="text-xl font-bold text-white tracking-tight">System Logistyczny</h1>
             <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase mt-0.5 truncate max-w-full" title={companyName}>{companyName}</p>
          </div>
          <nav className="p-4 space-y-1.5">
            <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Główny Pulpit</span>
            </Link>
            
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Flota i Ludzie</p>
            </div>
            <Link href="/admin/workers" className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <Users className="w-4 h-4" />
              <span>Pracownicy</span>
            </Link>
            <Link href="/admin/machines" className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <Wrench className="w-4 h-4" />
              <span>Maszyny i Warsztat</span>
            </Link>

            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Logistyka</p>
            </div>
            <Link href="/admin/materials" className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <HardHat className="w-4 h-4" />
              <span>Baza Kruszyw</span>
            </Link>
            <Link href="/admin/customers" className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <Package className="w-4 h-4" />
              <span>Klienci i Adresy</span>
            </Link>
            
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Raporty i Magazyn</p>
            </div>
            <Link href="/admin/archive" className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <FileClock className="w-4 h-4" />
              <span>Ewidencja Zleceń</span>
            </Link>

            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">System</p>
            </div>
            <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2.5 text-amber-500 hover:text-amber-400 hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm bg-amber-500/5">
              <Settings className="w-4 h-4" />
              <span>Ustawienia Firmy</span>
            </Link>
          </nav>
        </div>
        <div className="p-4 border-t border-zinc-800">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-900/60 rounded-lg transition-all group">
            <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
            <span className="text-sm font-medium">Wyloguj sesję</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0b] overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950 md:hidden sticky top-0 z-50">
          <div className="flex flex-col justify-center">
             <h1 className="text-lg font-bold text-white tracking-tight leading-tight">System Logistyczny</h1>
             <p className="text-[10px] text-zinc-500 font-semibold tracking-widest uppercase">{companyName}</p>
          </div>
          <Activity className="text-zinc-600 w-5 h-5" />
        </header>

        <div className="flex-1 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
