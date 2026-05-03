"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Users, Wrench, Map, HardHat, Package, FileClock, Settings } from "lucide-react";

export function AdminSidebarNav({ dict }: { dict: any }) {
  const pathname = usePathname();

  const links = [
    { href: "/admin", icon: Activity, label: dict.dashboard.title },
    { type: "section", label: dict.sidebar.fleetAndPeople },
    { href: "/admin/workers", icon: Users, label: dict.workers.title },
    { href: "/admin/machines", icon: Wrench, label: dict.machines.fleetTitle },
    { type: "section", label: dict.sidebar.logistics },
    { href: "/admin/orders", icon: Map, label: dict.orders.title },
    { href: "/admin/materials", icon: HardHat, label: dict.materials.title },
    { href: "/admin/customers", icon: Package, label: dict.customers.title },
    { type: "section", label: dict.sidebar.system },
    { href: "/admin/settings", icon: Settings, label: dict.sidebar.companySettings }
  ];

  return (
    <nav className="p-4 space-y-1.5">
      {links.map((link, idx) => {
        if (link.type === "section") {
          return (
            <div key={idx} className="pt-4 pb-2 px-3">
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">{link.label}</p>
            </div>
          );
        }

        const Icon = link.icon!;
        const isActive = pathname === link.href;
        // User request: remove highlight from company settings
        const isSettings = link.href === "/admin/settings";
        const shouldHighlight = isActive && !isSettings;

        return (
          <Link 
            key={link.href}
            href={link.href!}
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
