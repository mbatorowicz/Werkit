import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { platformRoutes } from "@/lib/appRoutes";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getDictionary } from "@/i18n";
import { getServerLocale } from "@/lib/localeCookies.server";
import { APP_VERSION } from "@/lib/version";
import { PAGE_TITLE } from "@/lib/uiTypography";
import { SURFACE_MINT } from "@/lib/uiTokens";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  const dict = getDictionary(locale).platform;
  const common = getDictionary(locale).common;

  return (
    <div className={cn("min-h-[100dvh] text-zinc-900 dark:text-zinc-100", SURFACE_MINT)}>
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <PlatformHeaderBar
          badge={dict.badge}
          title={dict.title}
          version={APP_VERSION}
          backLabel={common.actions.back}
          helpHref={platformRoutes.help}
          helpLabel={dict.helpLink}
        />
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}

function PlatformHeaderBar({
  badge,
  title,
  version,
  backLabel,
  helpHref,
  helpLabel,
}: {
  badge: string;
  title: string;
  version: string;
  backLabel: string;
  helpHref: string;
  helpLabel: string;
}) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="p-1.5 -ml-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          aria-label={backLabel}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-medium">
            {badge}
          </p>
          <h1 className={PAGE_TITLE}>{title}</h1>
          <p className="text-xs text-zinc-500">v{version}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={helpHref}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">{helpLabel}</span>
        </Link>
        <LocaleSwitcher />
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  );
}
