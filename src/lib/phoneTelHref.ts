/** href dla `tel:` — usuwa spacje, zostawia cyfry i leading +. */
export function phoneTelHref(phone: string): string {
  const normalized = phone.replace(/[^\d+]/g, "");
  return `tel:${normalized || phone}`;
}
