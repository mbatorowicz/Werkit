"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Users, Wrench, Map, HardHat, Package, FileClock, Settings } from "lucide-react";

export function AdminSidebarNav({ dict }: { dict: any }) {
  const pathname = usePathname();

  const links = [
    { href: "/admin", icon: Activity, label: dict.mainDashboard },
    { type: "section", label: dict.fleetAndPeople },
    { href: "/admin/workers", icon: Users, label: dict.workers },
    { href: "/admin/machines", icon: Wrench, label: dict.machinesAndWorkshop },
    { type: "section", label: dict.logistics },
    { href: "/admin/orders", icon: Map, label: dict.ordersAndDispatch },
    { href: "/admin/materials", icon: HardHat, label: dict.materialsBase },
    { href: "/admin/customers", icon: Package, label: dict.customersAndAddresses },
    { type: "section", label: dict.reportsAndWarehouse },
    { href: "/admin/archive", icon: FileClock, label: dict.orderRegistry },
    { type: "section", label: dict.system },
    { href: "/admin/settings", icon: Settings, label: dict.companySettings }
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

        return (
          <Link 
            key={link.href}
            href={link.href!}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
              isActive 
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:bg-zinc-900/60"
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
