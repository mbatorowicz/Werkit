import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/appRoutes";

/** Legacy URL — SSOT: `adminRoutes.people` (/admin/organization). */
export default function UsersPage() {
  redirect(adminRoutes.people);
}
