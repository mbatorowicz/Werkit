import { Map, Users, Package, Activity, LogOut, FileClock, Wrench, HardHat, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileAdminNav } from "@/components/MobileAdminNav";
import { AdminSidebarNav } from "@/components/AdminSidebarNav";
import { LogoutButton } from "@/components/LogoutButton";
import { db } from "@/db";
import { companySettings, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { APP_VERSION } from "@/lib/version";
import { getDictionary } from "@/i18n";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

import { JWT_SECRET } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const dict = getDictionary().admin;

  // Fetch SSOT for sidebar company name
  const settings = await db.select().from(companySettings).limit(1);
  const companyName = settings[0]?.companyName || dict.sidebar.defaultCompany;

  let loggedInUser = null;
  const token = (await cookies()).get('auth_token')?.value;
  if (token) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      if (verified.payload.userId) {
        const userDb = await db.select().from(users).where(eq(users.id, verified.payload.userId as number)).limit(1);
        if (userDb.length > 0) loggedInUser = userDb[0].fullName;
      }
    } catch (e) { }
  }

  return (
    <div className="flex h-screen bg-[#f2fbfa] dark:bg-zinc-900 overflow-hidden text-zinc-900 dark:text-zinc-100">
      <aside className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 flex flex-col justify-between hidden md:flex z-50">
        <div>
          <div className="h-[72px] flex flex-col justify-center px-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">WERKIT</h1>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">v{APP_VERSION}</span>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest uppercase mt-0.5 truncate max-w-full" title={companyName}>{companyName} - {dict.sidebar.logisticsSystem}</p>
          </div>
          <AdminSidebarNav dict={dict} />
        </div>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
          {loggedInUser && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
              <UserIcon className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-medium truncate">{loggedInUser}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <LogoutButton
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
              iconClass="w-4 h-4"
              text={dict.sidebar.logoutSession}
            />
            <ThemeToggle />
          </div>
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
          <div className="flex items-center gap-2">
            {loggedInUser && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700">
                <UserIcon className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">{loggedInUser}</span>
              </div>
            )}
            <MobileAdminNav companyName={companyName} version={APP_VERSION} dict={dict} loggedInUser={loggedInUser} />
          </div>
        </header>

        <div className="flex-1 relative">
          {children}
        </div>
      </main>
    </div>
  );
}



