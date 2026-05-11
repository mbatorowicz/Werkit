"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AppDictionary } from "@/i18n/types";
import { buildAdminNavLinks } from "./adminNavLinks";
import { isAdminDispatchNavActive } from "./adminNavActive";

export function AdminSidebarNav({ dict }: { dict: AppDictionary["admin"] }) {
  const pathname = usePathname();
  const links = buildAdminNavLinks(dict);

  return (
    <nav className="p-4 space-y-1.5">
      {links.map((link, idx) => {
        if (link.kind === "section") {
          return (
            <div key={`section-${idx}`} className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                {link.label}
              </p>
            </div>
          );
        }

        const Icon = link.icon;
        const isActive = isAdminDispatchNavActive(pathname, link.href);
        const isSettings = link.href === "/admin/settings";
        const shouldHighlight = isActive && !isSettings;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
              shouldHighlight
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800/50"
            }`}
          >
            <Icon className={`w-4 h-4 ${shouldHighlight ? "text-zinc-900 dark:text-white" : "text-zinc-500"}`} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
