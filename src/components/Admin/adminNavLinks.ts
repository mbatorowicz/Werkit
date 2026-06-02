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
  Cog,
  Layers,
  Tags,
} from "lucide-react";
import type { AppDictionary } from "@/i18n/types";
import { adminRoutes } from "@/lib/appRoutes";

export type AdminNavLinkItem =
  | { kind: "section"; label: string }
  | { kind: "route"; href: string; icon: LucideIcon; label: string };

/** Jedna definicja kolejności i etykiet — sidebar desktop i drawer mobilny. */
export function buildAdminNavLinks(
  adminDict: AppDictionary["admin"],
  durDict: AppDictionary["dur"]
): AdminNavLinkItem[] {
  return [
    {
      kind: "route",
      href: adminRoutes.dispatch,
      icon: LayoutDashboard,
      label: adminDict.sidebar.dispatch,
    },
    { kind: "route", href: adminRoutes.reports, icon: BarChart3, label: adminDict.sidebar.reports },
    { kind: "section", label: adminDict.sidebar.fleetAndPeople },
    { kind: "route", href: adminRoutes.users, icon: Users, label: adminDict.sidebar.users },
    { kind: "section", label: adminDict.sidebar.logistics },
    { kind: "route", href: adminRoutes.machines, icon: Wrench, label: adminDict.sidebar.resources },
    {
      kind: "route",
      href: adminRoutes.materials,
      icon: HardHat,
      label: adminDict.sidebar.materials,
    },
    {
      kind: "route",
      href: adminRoutes.customers,
      icon: Package,
      label: adminDict.sidebar.customers,
    },
    { kind: "section", label: adminDict.sidebar.ordersAndDispatch },
    {
      kind: "route",
      href: adminRoutes.dur.resourceGroups,
      icon: Layers,
      label: durDict.sidebar.resourceGroups,
    },
    {
      kind: "route",
      href: adminRoutes.dur.spareParts,
      icon: Cog,
      label: durDict.sidebar.spareParts,
    },
    {
      kind: "route",
      href: adminRoutes.dur.sparePartCategories,
      icon: Tags,
      label: durDict.sidebar.sparePartCategories,
    },
    {
      kind: "route",
      href: adminRoutes.dur.warehouse,
      icon: Package,
      label: durDict.sidebar.warehouse,
    },
    { kind: "section", label: adminDict.sidebar.system },
    {
      kind: "route",
      href: adminRoutes.settings,
      icon: Settings,
      label: adminDict.sidebar.companySettings,
    },
    {
      kind: "route",
      href: adminRoutes.logs,
      icon: TerminalSquare,
      label: adminDict.sidebar.deviceLogs,
    },
  ];
}
