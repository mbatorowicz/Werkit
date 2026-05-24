/** Normalizacja do wyszukiwania bez polskich znaków diakrytycznych. */
export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export function matchesSearchQuery(label: string, query: string): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;
  return normalizeSearchText(label).includes(q);
}

export function filterComboboxOptions<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string,
  limit = 12,
): T[] {
  const q = query.trim();
  const filtered = q
    ? items.filter((item) => matchesSearchQuery(getSearchText(item), q))
    : items;
  return filtered.slice(0, limit);
}
