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
import { isAdminGpsEnabled, toAdminGpsFlags } from "@/types/featureFlags";
import { cn } from "@/lib/cn";
import {
  LOGOUT_ROW,
  SHELL_HEADER,
  SHELL_SIDEBAR,
  USER_CHIP,
  VERSION_BADGE,
} from "@/lib/uiChrome";
import { BRAND_WORDMARK } from "@/lib/uiTypography";
import { SURFACE_APP, SURFACE_CARD, TEXT_MUTED } from "@/lib/uiTokens";

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
      gpsEnabled={isAdminGpsEnabled(featureFlags)}
      gpsFlags={toAdminGpsFlags(featureFlags)}
      durEnabled={featureFlags.durEnabled}
    >
      <div className={`layout-admin flex h-[100svh] max-h-[100dvh] overflow-hidden ${SURFACE_APP}`}>
        <aside className={SHELL_SIDEBAR}>
          <div className={`min-h-0 flex-1 ${VERTICAL_SCROLL_PANEL_CLASS}`}>
            <div className="flex h-[72px] flex-col justify-center border-b border-zinc-200 px-6 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <h1 className={BRAND_WORDMARK}>{fullDict.common.app.name.toUpperCase()}</h1>
                <span className={`text-[10px] ${VERSION_BADGE}`}>v{APP_VERSION}</span>
              </div>
              <p
                className={`mt-0.5 max-w-full truncate text-[10px] font-semibold uppercase tracking-widest ${TEXT_MUTED}`}
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
              className={LOGOUT_ROW}
              iconClass="w-4 h-4"
              text={dict.sidebar.logoutSession}
            />
          </div>
        </aside>

        <main className={`flex min-w-0 flex-1 flex-col ${SURFACE_CARD} ${INLINE_SCROLL_PANEL_CLASS}`}>
          <header className={cn(SHELL_HEADER, "px-6 md:hidden")}>
            <div className="flex items-center gap-3">
              <AdminMobileBackButton />
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <h1 className={BRAND_WORDMARK}>{fullDict.common.app.name.toUpperCase()}</h1>
                  <span className={`text-[9px] ${VERSION_BADGE}`}>v{APP_VERSION}</span>
                </div>
                <p className={`max-w-[200px] truncate text-[10px] font-semibold uppercase tracking-widest ${TEXT_MUTED}`}>
                  {companyName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loggedInUser && (
                <div className={USER_CHIP}>
                  <UserIcon className="h-3 w-3 shrink-0 text-emerald-500" />
                  <span className="max-w-[100px] truncate text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
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
