/** Jedna linia wyświetlana w aplikacji (lista maszyn, zlecenia) — powstaje z marki, modelu i nr rej. */
export function buildResourceDisplayName(
  brand: string,
  model: string,
  registrationNumber: string,
): string {
  const b = brand.trim();
  const m = model.trim();
  const r = registrationNumber.trim().replace(/\s+/g, "").toUpperCase();
  const left = [b, m].filter(Boolean).join(" ");
  let result = "";
  if (left && r) result = `${left} · ${r}`;
  else if (left) result = left;
  else if (r) result = r;
  return result.slice(0, 255);
}

export function isVehicleIdentityEmpty(
  brand: string,
  model: string,
  registrationNumber: string,
): boolean {
  return buildResourceDisplayName(brand, model, registrationNumber) === "";
}

/** Jedna linia nazwy zasobu: najpierw marka/model/nr rej., inaczej opis (np. lokalizacja). */
export function buildResourceCanonicalName(
  brand: string,
  model: string,
  registrationNumber: string,
  description?: string | null,
): string {
  const base = buildResourceDisplayName(brand, model, registrationNumber);
  if (base) return base.slice(0, 255);
  const d = typeof description === "string" ? description.trim() : "";
  if (d) return d.slice(0, 255);
  return "";
}
