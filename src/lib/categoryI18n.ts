import type { AppDictionary } from "@/i18n/types";

/** Wspólne etykiety drzewa kategorii (zlecenia, materiały, części DUR). */
export function categorySharedLabels(dict: AppDictionary, scope: "admin" | "dur" = "admin") {
  const extra = scope === "dur" ? dict.dur.categories.shared : dict.admin.categories.shared;
  return { ...dict.common.categories.shared, ...extra };
}
