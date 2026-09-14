import { Map, Clock, User, HelpCircle } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { APP_VERSION } from "@/lib/version";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";

import { requireLiveCompanyPrincipalOrRedirect } from "@/lib/livePrincipal";
import { DEFAULT_COMPANY_NAME } from "@/lib/productName";
import { workerRoutes } from "@/lib/appRoutes";
export const dynamic = "force-dynamic";

import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";
import { INLINE_SCROLL_PANEL_CLASS } from "@/components/scrollPanelStyles";
import {
  ICON_BTN_GHOST,
  NAV_ITEM,
  NAV_ITEM_LABEL,
  SHELL_FOOTER_NAV,
  SHELL_HEADER,
  USER_CHIP,
  VERSION_BADGE,
} from "@/lib/uiChrome";
import { BRAND_WORDMARK } from "@/lib/uiTypography";
import { SURFACE_APP, TEXT_MUTED } from "@/lib/uiTokens";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const fullDict = getDictionary(await getServerLocale());
  const dict = fullDict.worker.nav;
  const unknownWorker = fullDict.worker.profile.roleWorker;
  const { DictionaryService } = await import("@/services/DictionaryService");

  const principal = await requireLiveCompanyPrincipalOrRedirect();
  const settings = await DictionaryService.getSettings(principal.companyId);
  const companyName = settings[0]?.companyName || DEFAULT_COMPANY_NAME;
  const userName = principal.fullName.trim() ? principal.fullName : unknownWorker;

  return (
    <div className={`layout-worker flex h-[100dvh] flex-col overflow-hidden ${SURFACE_APP}`}>
      <GlobalErrorHandler />
      <header className={SHELL_HEADER}>
        <div>
          <div className="flex items-center gap-2">
            <h1 className={BRAND_WORDMARK}>{fullDict.common.app.name.toUpperCase()}</h1>
            <span className={`text-[9px] ${VERSION_BADGE}`}>v{APP_VERSION}</span>
          </div>
          <p
            className={`max-w-[200px] truncate text-[10px] font-semibold uppercase tracking-widest ${TEXT_MUTED}`}
            title={companyName}
          >
            {companyName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`mr-1 sm:mr-2 ${USER_CHIP}`}>
            <User className="h-3 w-3 text-emerald-500" />
            <span className="max-w-[120px] truncate text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
              {userName}
            </span>
          </div>
          <ThemeToggle />
          <LogoutButton className={ICON_BTN_GHOST} iconClass="w-5 h-5" />
        </div>
      </header>

      <main className={`mx-auto w-full max-w-md flex-1 p-4 ${INLINE_SCROLL_PANEL_CLASS}`}>
        {children}
      </main>

      <nav className={SHELL_FOOTER_NAV}>
        <Link href="/worker" className={NAV_ITEM}>
          <Clock className="h-5 w-5" />
          <span className={NAV_ITEM_LABEL}>{dict.session}</span>
        </Link>
        <Link href="/worker/history" className={NAV_ITEM}>
          <Map className="h-5 w-5" />
          <span className={NAV_ITEM_LABEL}>{dict.history}</span>
        </Link>
        <Link href="/worker/profile" className={NAV_ITEM}>
          <User className="h-5 w-5" />
          <span className={NAV_ITEM_LABEL}>{dict.profile}</span>
        </Link>
        <Link href={workerRoutes.help} className={NAV_ITEM}>
          <HelpCircle className="h-5 w-5" />
          <span className={NAV_ITEM_LABEL}>{dict.help}</span>
        </Link>
      </nav>
    </div>
  );
}
