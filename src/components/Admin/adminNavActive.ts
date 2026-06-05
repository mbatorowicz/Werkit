/** Dyspozycja — kanoniczna trasa `/admin`. */
export function isAdminDispatchNavActive(pathname: string, href: string): boolean {
  return pathname === href;
}
