import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Wrench,
  HardHat,
  Package,
  Settings,
  TerminalSquare,
  BarChart3,
} from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import { adminRoutes } from "@/lib/appRoutes";

export type AdminNavLinkItem =
  | { kind: "section"; label: string }
  | { kind: "route"; href: string; icon: LucideIcon; label: string };

/** Jedna definicja kolejności i etykiet — sidebar desktop i drawer mobilny. */
export function buildAdminNavLinks(dict: AppDictionary["admin"]): AdminNavLinkItem[] {
  return [
    { kind: "route", href: adminRoutes.dispatch, icon: LayoutDashboard, label: dict.sidebar.dispatch },
    { kind: "route", href: adminRoutes.reports, icon: BarChart3, label: dict.sidebar.reports },
    { kind: "section", label: dict.sidebar.fleetAndPeople },
    { kind: "route", href: adminRoutes.users, icon: Users, label: dict.sidebar.users },
    { kind: "section", label: dict.sidebar.logistics },
    { kind: "route", href: adminRoutes.machines, icon: Wrench, label: dict.sidebar.resources },
    { kind: "route", href: adminRoutes.materials, icon: HardHat, label: dict.sidebar.materials },
    { kind: "route", href: adminRoutes.customers, icon: Package, label: dict.sidebar.customers },
    { kind: "section", label: dict.sidebar.system },
    { kind: "route", href: adminRoutes.settings, icon: Settings, label: dict.sidebar.companySettings },
    { kind: "route", href: adminRoutes.logs, icon: TerminalSquare, label: dict.sidebar.deviceLogs },
  ];
}
