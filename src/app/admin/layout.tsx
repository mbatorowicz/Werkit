import { Map, Users, Package, Activity, LogOut, FileClock, Wrench, HardHat, Settings } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileAdminNav } from "@/components/MobileAdminNav";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { APP_VERSION } from "@/lib/version";

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Fetch SSOT for sidebar company name
  const settings = await db.select().from(companySettings).limit(1);
  const companyName = settings[0]?.companyName || "Dodaj Nazwę Firmy";

  return (
    <div className="flex h-screen bg-[#f2fbfa] dark:bg-zinc-900 overflow-hidden text-zinc-900 dark:text-zinc-100">
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 flex flex-col justify-between hidden md:flex z-50">
        <div>
          <div className="h-[72px] flex flex-col justify-center px-6 border-b border-zinc-200 dark:border-zinc-800">
             <div className="flex items-center gap-2">
               <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">WERKIT</h1>
               <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">v{APP_VERSION}</span>
             </div>
             <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest uppercase mt-0.5 truncate max-w-full" title={companyName}>{companyName} - System Logistyczny</p>
          </div>
          <nav className="p-4 space-y-1.5">
            <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span>Główny Pulpit</span>
            </Link>
            
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Flota i Ludzie</p>
            </div>
            <Link href="/admin/workers" className="flex items-center gap-3 px-3 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <Users className="w-4 h-4" />
              <span>Pracownicy</span>
            </Link>
            <Link href="/admin/machines" className="flex items-center gap-3 px-3 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <Wrench className="w-4 h-4" />
              <span>Maszyny i Warsztat</span>
            </Link>

            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Logistyka</p>
            </div>
            <Link href="/admin/orders" className="flex items-center gap-3 px-3 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm text-amber-500 hover:text-amber-400">
              <Map className="w-4 h-4 text-amber-500" />
              <span>Zlecenia i Dyspozycja</span>
            </Link>
            <Link href="/admin/materials" className="flex items-center gap-3 px-3 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <HardHat className="w-4 h-4" />
              <span>Baza Kruszyw</span>
            </Link>
            <Link href="/admin/customers" className="flex items-center gap-3 px-3 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <Package className="w-4 h-4" />
              <span>Klienci i Adresy</span>
            </Link>
            
            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Raporty i Magazyn</p>
            </div>
            <Link href="/admin/archive" className="flex items-center gap-3 px-3 py-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <FileClock className="w-4 h-4" />
              <span>Ewidencja Zleceń</span>
            </Link>

            <div className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">System</p>
            </div>
            <Link href="/admin/settings" className="flex items-center gap-3 px-3 py-2.5 text-amber-500 hover:text-amber-400 hover:bg-white dark:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm bg-amber-500/5">
              <Settings className="w-4 h-4" />
              <span>Ustawienia Firmy</span>
            </Link>
          </nav>
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <ThemeToggle />
          <a href="/api/auth/logout" className="flex-1 flex items-center gap-3 px-3 py-2.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white dark:bg-zinc-900/60 rounded-lg transition-all group">
            <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
            <span className="text-sm font-medium">Wyloguj sesję</span>
          </a>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900 overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-700 bg-[#f2fbfa] dark:bg-zinc-900 md:hidden sticky top-0 z-50">
          <div className="flex flex-col justify-center">
             <div className="flex items-center gap-2">
               <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">WERKIT</h1>
               <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">v{APP_VERSION}</span>
             </div>
             <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest uppercase truncate max-w-[200px]">{companyName}</p>
          </div>
          <MobileAdminNav companyName={companyName} version={APP_VERSION} />
        </header>

        <div className="flex-1 relative">
          {children}
        </div>
      </main>
    </div>
  );
}



