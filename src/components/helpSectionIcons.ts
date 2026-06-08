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

const WORKER_ICONS: Record<string, LucideIcon> = {
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
};

const ADMIN_ICONS: Record<string, LucideIcon> = {
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
};

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  register: Building2,
  manage: Building2,
  "feature-flags": Flag,
  metrics: Activity,
};

export function getHelpSectionIcon(
  sectionId: string,
  scope: "worker" | "admin" | "platform"
): LucideIcon {
  if (scope === "worker") return WORKER_ICONS[sectionId] ?? Info;
  if (scope === "admin") return ADMIN_ICONS[sectionId] ?? Info;
  return PLATFORM_ICONS[sectionId] ?? Info;
}
