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

export type AdminNavLinkItem =
  | { kind: "section"; label: string }
  | { kind: "route"; href: string; icon: LucideIcon; label: string };

/** Jedna definicja kolejności i etykiet — sidebar desktop i drawer mobilny. */
export function buildAdminNavLinks(dict: AppDictionary["admin"]): AdminNavLinkItem[] {
  return [
    { kind: "route", href: "/admin", icon: LayoutDashboard, label: dict.sidebar.dispatch },
    { kind: "route", href: "/admin/reports", icon: BarChart3, label: dict.sidebar.reports },
    { kind: "section", label: dict.sidebar.fleetAndPeople },
    { kind: "route", href: "/admin/users", icon: Users, label: dict.sidebar.users },
    { kind: "section", label: dict.sidebar.logistics },
    { kind: "route", href: "/admin/machines", icon: Wrench, label: dict.sidebar.resources },
    { kind: "route", href: "/admin/materials", icon: HardHat, label: dict.sidebar.materials },
    { kind: "route", href: "/admin/customers", icon: Package, label: dict.sidebar.customers },
    { kind: "section", label: dict.sidebar.system },
    { kind: "route", href: "/admin/settings", icon: Settings, label: dict.sidebar.companySettings },
    { kind: "route", href: "/admin/logs", icon: TerminalSquare, label: dict.sidebar.deviceLogs },
  ];
}
