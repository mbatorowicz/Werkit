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
