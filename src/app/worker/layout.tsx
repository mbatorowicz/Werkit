import { Map, Clock, User, LogOut, HelpCircle } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { db } from "@/db";
import { companySettings, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { APP_VERSION } from "@/lib/version";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-fallback');

export const dynamic = 'force-dynamic';

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const settings = await db.select().from(companySettings).limit(1);
  const companyName = settings[0]?.companyName || "Werkit ERP";

  let userName = "Pracownik";
  try {
    const token = (await cookies()).get('auth_token')?.value;
    if (token) {
      const verified = await jwtVerify(token, JWT_SECRET);
      const userId = verified.payload.userId as number;
      const userRec = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRec.length > 0) {
        userName = userRec[0].fullName;
      }
    }
  } catch (e) {}

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#f2fbfa] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <header className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 sticky top-0 z-50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">WERKIT</h1>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">v{APP_VERSION}</span>
          </div>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest uppercase truncate max-w-[200px]" title={companyName}>{companyName}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1 sm:mr-2 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700">
            <User className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{userName}</span>
          </div>
          <ThemeToggle />
          <LogoutButton className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors" iconClass="w-5 h-5" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-md mx-auto p-4 overflow-y-auto">
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
        <Link href="/worker/profile" className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex-1 h-full gap-1">
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Profil</span>
        </Link>
        <Link href="/worker/help" className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-colors flex-1 h-full gap-1">
          <HelpCircle className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">Pomoc</span>
        </Link>
      </nav>
    </div>
  );
}


