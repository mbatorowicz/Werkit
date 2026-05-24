import { adminRoutes } from "@/lib/appRoutes";

/** Dyspozycja: `/admin` oraz legacy redirect `/admin/orders` → ten sam ekran. */
export function isAdminDispatchNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === adminRoutes.dispatch && pathname.startsWith("/admin/orders")) return true;
  return false;
}
