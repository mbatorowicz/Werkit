/** Dwie ścieżki prowadzą do tego samego `OrdersClient` (`/admin` oraz `/admin/orders`). */
export function isAdminDispatchNavActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/admin" && pathname.startsWith("/admin/orders")) return true;
  return false;
}
