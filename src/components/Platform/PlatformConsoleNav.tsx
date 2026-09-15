"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { platformRoutes } from "@/lib/appRoutes";

type Props = {
  registryLabel: string;
  auditLabel: string;
};

export function PlatformConsoleNav({ registryLabel, auditLabel }: Props) {
  const pathname = usePathname();
  const onRegistry = pathname === platformRoutes.home;
  const onAudit = pathname === platformRoutes.audit || pathname.startsWith(`${platformRoutes.audit}/`);

  const itemClass = (active: boolean) =>
    cn(
      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    );

  return (
    <nav aria-label={registryLabel} className="flex flex-wrap items-center gap-1">
      <Link
        href={platformRoutes.home}
        className={itemClass(onRegistry)}
        aria-current={onRegistry ? "page" : undefined}
      >
        {registryLabel}
      </Link>
      <Link
        href={platformRoutes.audit}
        className={itemClass(onAudit)}
        aria-current={onAudit ? "page" : undefined}
      >
        {auditLabel}
      </Link>
    </nav>
  );
}
