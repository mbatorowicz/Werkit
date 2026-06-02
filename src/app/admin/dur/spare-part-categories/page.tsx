import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/appRoutes";

/** Kategorie części — jedna strona z katalogiem (`/admin/dur/spare-parts`). */
export default function SparePartCategoriesPage() {
  redirect(adminRoutes.dur.spareParts);
}
