import { ArrowLeft, User as UserIcon, Shield, Settings } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { LogoutButton } from "@/components/LogoutButton";
import { ProfileSettings } from "@/features/worker/components/profile/ProfileSettings";
import { ProfileOrgSection } from "@/components/organization/ProfileOrgSection";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";
import { requireServerCompanyId } from "@/lib/serverTenant";
import { BTN_PRIMARY, BTN_DANGER_SOFT } from "@/lib/uiButtons";
import { CARD, SURFACE_MINT } from "@/lib/uiTokens";
import { PAGE_TITLE } from "@/lib/uiTypography";
import { cn } from "@/lib/cn";

import { JWT_SECRET } from "@/lib/auth";
async function getUserId() {
  const token = (await cookies()).get("auth_token")?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.userId as number;
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const dict = getDictionary(await getServerLocale()).worker.profile;
  const userId = await getUserId();
  if (!userId) return <div>{dict.noAccess}</div>;

  const { AdminUserService } = await import("@/services/AdminUserService");
  const { DelegationScopeService } = await import("@/services/DelegationScopeService");
  const user = await AdminUserService.getUserById(userId);
  const companyId = await requireServerCompanyId();
  const orgProfile = await DelegationScopeService.getUserOrgProfile(companyId, userId);

  return (
    <div className="py-6 pb-20">
      <Link
        href="/worker"
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-semibold">{dict.backToSession}</span>
      </Link>

      <h1 className={cn(PAGE_TITLE, "mb-8 text-2xl")}>{dict.title}</h1>

      <div className={cn(CARD, "mb-6 flex flex-col items-center p-6")}>
        <div
          className={cn(
            "mb-4 flex h-24 w-24 items-center justify-center rounded-full border-2 border-zinc-200 dark:border-zinc-700",
            SURFACE_MINT
          )}
        >
          <UserIcon className="h-10 w-10 text-zinc-500" />
        </div>
        <h2 className="mb-1 text-xl font-bold text-zinc-900 dark:text-white">{user?.fullName}</h2>
        <div
          className={cn(
            "flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-700",
            SURFACE_MINT
          )}
        >
          <Shield className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
            {user?.role === "admin" ? dict.roleAdmin : dict.roleWorker}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <ProfileOrgSection profile={orgProfile} dict={dict.org} />

        <div className={cn(CARD, "flex items-center justify-between p-5")}>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {dict.systemLogin}:
          </span>
          <span
            className={cn(
              "rounded-md border border-zinc-200 px-3 py-1 font-mono text-zinc-900 dark:border-zinc-700 dark:text-zinc-100",
              SURFACE_MINT
            )}
          >
            {user?.usernameEmail}
          </span>
        </div>

        {user?.role === "admin" && (
          <Link
            href="/admin"
            className={cn(
              "w-full flex items-center justify-center gap-3 p-5 mt-4 shadow-sm",
              BTN_PRIMARY
            )}
          >
            <Settings className="w-5 h-5" />
            {dict.goToAdminPanel}
          </Link>
        )}

        <ProfileSettings
          initialEnabled={user?.notificationsEnabled ?? true}
          initialBiometricLoginEnabled={user?.biometricLoginEnabled ?? false}
          usernameEmail={user?.usernameEmail ?? ""}
          role={user?.role === "admin" ? "admin" : "worker"}
        />

        <LogoutButton
          className={cn(
            BTN_DANGER_SOFT,
            "mt-8 w-full p-5 group"
          )}
          iconClass="w-5 h-5 group-hover:text-red-400 transition-colors"
          text={dict.logout}
        />
      </div>
    </div>
  );
}
