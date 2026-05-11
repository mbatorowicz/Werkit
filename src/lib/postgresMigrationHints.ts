/** Typowe błędy Postgres przy niewykonanych migracjach Drizzle — bez logowania sekretów. */

export function isMissingResourcesVehicleColumns(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /column .*does not exist/i.test(msg) &&
    /(brand|model|registration_number)/i.test(msg)
  );
}

export function isMissingResourceCategoriesStationaryColumn(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /column .*does not exist/i.test(msg) &&
    /is_stationary/i.test(msg)
  );
}

export function isMissingMaterialCategoriesTables(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    (/relation|table/i.test(msg) && /does not exist/i.test(msg)) &&
    /material_categories|material_to_categories/i.test(msg)
  );
}
