import type { BaseCustomer } from "@/types/admin";
import { matchesSearchQuery } from "@/lib/searchComboboxFilter";

export function formatCustomerLabel(c: {
  firstName?: string | null;
  lastName?: string | null;
}): string {
  return [c.lastName, c.firstName].filter(Boolean).join(" ").trim();
}

/** Tekst do filtrowania: imię, nazwisko, ulica, miejscowość (segmenty adresu + lokalizacje). */
export function buildCustomerSearchText(
  c: Pick<BaseCustomer, "firstName" | "lastName" | "phone" | "defaultAddress" | "locationAddresses">
): string {
  const tokens: string[] = [];

  const pushParts = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    tokens.push(trimmed);
    for (const segment of trimmed
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)) {
      tokens.push(segment);
    }
    for (const word of trimmed.split(/\s+/).filter((w) => w.length >= 2)) {
      tokens.push(word);
    }
  };

  if (c.firstName?.trim()) tokens.push(c.firstName.trim());
  if (c.lastName?.trim()) tokens.push(c.lastName.trim());
  if (c.phone?.trim()) tokens.push(c.phone.trim());
  if (c.defaultAddress?.trim()) pushParts(c.defaultAddress);
  for (const loc of c.locationAddresses ?? []) {
    if (loc.trim()) pushParts(loc);
  }

  return [...new Set(tokens)].join(" ");
}

export function formatCustomerDisplayAddress(
  c: Pick<BaseCustomer, "defaultAddress" | "locationAddresses">
): string | undefined {
  const primary = c.defaultAddress?.trim();
  if (primary) return primary;
  return c.locationAddresses?.map((a) => a.trim()).find(Boolean);
}

export function matchesCustomerSearch(
  c: Pick<
    BaseCustomer,
    "firstName" | "lastName" | "phone" | "defaultAddress" | "locationAddresses"
  >,
  query: string
): boolean {
  return matchesSearchQuery(buildCustomerSearchText(c), query);
}
