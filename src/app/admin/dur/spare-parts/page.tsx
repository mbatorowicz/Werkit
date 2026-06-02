import { redirect } from "next/navigation";
import { adminRoutes } from "@/lib/appRoutes";

/** Legacy URL — katalog i gospodarka magazynowa na `/admin/dur/warehouse`. */
export default function SparePartsPage() {
  redirect(adminRoutes.dur.warehouse);
}
