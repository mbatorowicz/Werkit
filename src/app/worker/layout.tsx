import { Map, Clock, User, HelpCircle } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { APP_VERSION } from "@/lib/version";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";

import { JWT_SECRET } from "@/lib/auth";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { workerRoutes } from "@/lib/appRoutes";
export const dynamic = "force-dynamic";

import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";
import { INLINE_SCROLL_PANEL_CLASS } from "@/components/scrollPanelStyles";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const dict = getDictionary(await getServerLocale()).worker.nav;
  const { DictionaryService } = await import("@/services/DictionaryService");
  const { AdminUserService } = await import("@/services/AdminUserService");

  const companyId = await requireServerCompanyId();
  const settings = await DictionaryService.getSettings(companyId);
  const companyName = settings[0]?.companyName || "Werkit ERP";

  let userName = "Pracownik";
  try {
    const token = (await cookies()).get("auth_token")?.value;
    if (token) {
      const verified = await jwtVerify(token, JWT_SECRET);
      const userId = verified.payload.userId as number;
      const userRec = await AdminUserService.getUserById(userId);
      if (userRec) {
        userName = userRec.fullName;
      }
    }
  } catch {}

  return (
    <div className="layout-worker flex flex-col h-[100dvh] overflow-hidden bg-[#f2fbfa] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <GlobalErrorHandler />
      <header className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 sticky top-0 z-50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">
              WERKIT
            </h1>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
              v{APP_VERSION}
            </span>
          </div>
          <p
            className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest uppercase truncate max-w-[200px]"
            title={companyName}
          >
            {companyName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mr-1 flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800 sm:mr-2">
            <User className="h-3 w-3 text-emerald-500" />
            <span className="max-w-[120px] truncate text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
              {userName}
            </span>
          </div>
          <ThemeToggle />
          <LogoutButton
            className="p-2 text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            iconClass="w-5 h-5"
          />
        </div>
      </header>

      <main className={`flex-1 w-full max-w-md mx-auto p-4 ${INLINE_SCROLL_PANEL_CLASS}`}>
        {children}
      </main>

      <nav className="h-16 border-t border-zinc-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-900 flex items-center justify-around sticky bottom-0 z-50 pb-safe">
        <Link
          href="/worker"
          className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-emerald-500 transition-colors flex-1 h-full gap-1"
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">{dict.session}</span>
        </Link>
        <Link
          href="/worker/history"
          className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-amber-500 transition-colors flex-1 h-full gap-1"
        >
          <Map className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">{dict.history}</span>
        </Link>
        <Link
          href="/worker/profile"
          className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex-1 h-full gap-1"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">{dict.profile}</span>
        </Link>
        <Link
          href={workerRoutes.help}
          className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-colors flex-1 h-full gap-1"
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-[10px] font-semibold uppercase tracking-wider">{dict.help}</span>
        </Link>
      </nav>
    </div>
  );
}
