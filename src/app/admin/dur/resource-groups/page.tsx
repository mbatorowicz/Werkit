import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/appRoutes";

export default function DurResourceGroupsPage() {
  // Legacy: typy zasobów są w module Zasoby.
  redirect(adminRoutes.machines);
}
