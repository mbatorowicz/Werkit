import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/appRoutes";

/** Kategorie części — jedna strona Magazyn (`/admin/dur/warehouse`). */
export default function SparePartCategoriesPage() {
  redirect(adminRoutes.dur.warehouse);
}
