import { Map, Package, Activity, LogOut, FileClock } from "lucide-react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="h-[72px] flex items-center px-6 border-b border-zinc-800">
            <h1 className="text-xl font-medium text-white tracking-tight">Werkit.</h1>
          </div>
          <nav className="p-4 space-y-1">
            <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <Map className="w-4 h-4" />
              <span>Dashboard GPS</span>
            </Link>
            <Link href="/admin/archive" className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm">
              <FileClock className="w-4 h-4" />
              <span>Historia Działań</span>
            </Link>
            <Link href="/admin/resources" className="flex items-center gap-3 px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-zinc-900/60 rounded-lg transition-all font-medium text-sm opacity-50 cursor-not-allowed">
              <Package className="w-4 h-4" />
              <span>Zasoby i Magazyn</span>
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950 md:hidden">
          <h1 className="text-lg font-medium text-white tracking-tight">Werkit.</h1>
          <Activity className="text-zinc-600 w-5 h-5" />
        </header>

        <div className="flex-1 bg-[#0a0a0b] relative">
          {children}
        </div>
      </main>
    </div>
  );
}
