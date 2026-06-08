import type { LucideIcon } from "lucide-react";
import {
  Play,
  Camera,
  Navigation,
  Info,
  Wand2,
  Users,
  WifiOff,
  Bell,
  Map,
  History,
  Package,
  User,
  LayoutDashboard,
  BarChart3,
  Wrench,
  HardHat,
  Settings,
  TerminalSquare,
  Eye,
  Building2,
  Flag,
  Activity,
  BookOpen,
} from "lucide-react";
import type { HelpScope } from "@/lib/help/constants";

const ICONS_BY_SCOPE: Record<HelpScope, Record<string, LucideIcon>> = {
  worker: {
    "start-work": Play,
    "notes-photos": Camera,
    "gps-tracking": Navigation,
    "custom-orders": Info,
    wizard: Wand2,
    delegation: Users,
    offline: WifiOff,
    alarms: Bell,
    navigation: Map,
    history: History,
    "dur-parts": Package,
    profile: User,
  },
  admin: {
    intro: BookOpen,
    dispatch: LayoutDashboard,
    reports: BarChart3,
    people: Users,
    resources: Wrench,
    materials: HardHat,
    customers: Package,
    "dur-warehouse": Package,
    settings: Settings,
    logs: TerminalSquare,
    viewer: Eye,
  },
  platform: {
    register: Building2,
    manage: Building2,
    "feature-flags": Flag,
    metrics: Activity,
  },
};

export function getHelpSectionIcon(sectionId: string, scope: HelpScope): LucideIcon {
  return ICONS_BY_SCOPE[scope][sectionId] ?? Info;
}
