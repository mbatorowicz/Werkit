import { User as UserIcon } from "lucide-react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { MobileAdminNav } from "@/components/Admin/MobileAdminNav";
import { AdminSidebarNav } from "@/components/Admin/AdminSidebarNav";
import { AdminMobileBackButton } from "@/components/Admin/AdminMobileBackButton";
import { LogoutButton } from "@/components/LogoutButton";
import { APP_VERSION } from "@/lib/version";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

import { JWT_SECRET } from "@/lib/auth";
import {
  AdminAbilityProvider,
  type DelegationScope,
} from "@/components/Admin/AdminAbilityProvider";
import { DelegationScopeService } from "@/services/DelegationScopeService";
import { INLINE_SCROLL_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { VERTICAL_SCROLL_PANEL_CLASS } from "@/lib/uiScrollPanels";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { PlatformFeatureFlagService } from "@/services/PlatformFeatureFlagService";
import { isGpsModuleEnabled } from "@/types/featureFlags";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const fullDict = getDictionary(await getServerLocale());
  const dict = fullDict.admin;
  const durDict = fullDict.dur;

  const { DictionaryService } = await import("@/services/DictionaryService");
  const { AdminUserService } = await import("@/services/AdminUserService");

  const companyId = await requireServerCompanyId();
  const [settings, featureFlags] = await Promise.all([
    DictionaryService.getSettings(companyId),
    PlatformFeatureFlagService.getFlags(companyId),
  ]);
  const companyName = settings[0]?.companyName || dict.sidebar.defaultCompany;

  let loggedInUser = null;
  let canMutate = false;
  let canDelegateOrders = false;
  let delegationScope: DelegationScope = "none";
  const token = (await cookies()).get("auth_token")?.value;
  if (token) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      const role = verified.payload.role as string;
      canMutate = role === "admin";
      const userId = verified.payload.userId as number | undefined;
      if (userId) {
        const [userDb, hasDelegation] = await Promise.all([
          AdminUserService.getUserById(userId),
          DelegationScopeService.hasDelegationRights(companyId, userId),
        ]);
        if (userDb) loggedInUser = userDb.fullName;
        canDelegateOrders = canMutate || hasDelegation;
        delegationScope = canMutate ? "all" : hasDelegation ? "scoped" : "none";
      }
    } catch {
      /* ignore */
    }
  }

  const scopedViewerNav = delegationScope === "scoped" && !canMutate;

  return (
    <AdminAbilityProvider
      canMutate={canMutate}
      canDelegateOrders={canDelegateOrders}
      delegationScope={delegationScope}
      gpsEnabled={isGpsModuleEnabled(featureFlags)}
      durEnabled={featureFlags.durEnabled}
    >
      <div className="layout-admin flex h-[100svh] max-h-[100dvh] overflow-hidden bg-[#f2fbfa] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
        <aside className="z-50 hidden h-full min-h-0 w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900 md:flex">
          <div className={`min-h-0 flex-1 ${VERTICAL_SCROLL_PANEL_CLASS}`}>
            <div className="h-[72px] flex flex-col justify-center px-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">
                  WERKIT
                </h1>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                  v{APP_VERSION}
                </span>
              </div>
              <p
                className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest uppercase mt-0.5 truncate max-w-full"
                title={companyName}
              >
                {companyName} - {dict.sidebar.logisticsSystem}
              </p>
            </div>
            <AdminSidebarNav
              dict={dict}
              durDict={durDict}
              durEnabled={featureFlags.durEnabled}
              scopedViewer={scopedViewerNav}
            />
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-200 px-4 pt-4 dark:border-zinc-800">
            {loggedInUser && (
              <div className="flex flex-col gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span className="truncate font-medium">{loggedInUser}</span>
                </div>
                <LocaleSwitcher variant="embedded" />
              </div>
            )}
            <LogoutButton
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-zinc-500 transition-all hover:bg-red-50 hover:text-red-500 dark:text-zinc-400 dark:hover:bg-red-500/10"
              iconClass="w-4 h-4"
              text={dict.sidebar.logoutSession}
            />
          </div>
        </aside>

        <main
          className={`flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-900 ${INLINE_SCROLL_PANEL_CLASS}`}
        >
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-[#f2fbfa] px-6 dark:border-zinc-700 dark:bg-zinc-900 md:hidden">
            <div className="flex items-center gap-3">
              <AdminMobileBackButton />
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 tracking-tighter">
                    WERKIT
                  </h1>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold">
                    v{APP_VERSION}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold tracking-widest uppercase truncate max-w-[200px]">
                  {companyName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loggedInUser && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700">
                  <UserIcon className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">
                    {loggedInUser}
                  </span>
                </div>
              )}
              <MobileAdminNav
                companyName={companyName}
                version={APP_VERSION}
                dict={dict}
                durDict={durDict}
                durEnabled={featureFlags.durEnabled}
                scopedViewer={scopedViewerNav}
                loggedInUser={loggedInUser}
              />
            </div>
          </header>

          <div className="flex-1 pb-8">{children}</div>
        </main>
      </div>
    </AdminAbilityProvider>
  );
}
