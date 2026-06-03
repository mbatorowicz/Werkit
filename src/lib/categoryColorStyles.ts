import type { CSSProperties } from "react";

/** Domyślny kolor kategorii — zgodny z DEFAULT w DB (`resource_categories`, `material_categories`, `spare_part_categories`). */
export const DEFAULT_CATEGORY_COLOR = "#3f3f46";

const CHIP_UNSELECTED_CLASS =
  "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300";

export function resolveCategoryColor(color: string | null | undefined): string {
  const trimmed = typeof color === "string" ? color.trim() : "";
  return trimmed || DEFAULT_CATEGORY_COLOR;
}

/** Kolor do formularzy edycji (input type=color). */
export function resolveCategoryColorForForm(color: string | null | undefined): string {
  return resolveCategoryColor(color);
}

/** Style inline badge kategorii — SSOT dla całej aplikacji. */
export function categoryColorBadgeStyle(color: string | null | undefined): CSSProperties {
  const hex = resolveCategoryColor(color);
  return {
    backgroundColor: `${hex}1a`,
    color: hex,
    borderColor: `${hex}33`,
  };
}

/** Jednolity kolor wypełnienia (kropka, pasek, swatch w drzewie). */
export function categoryColorSwatchStyle(color: string | null | undefined): CSSProperties {
  return { backgroundColor: resolveCategoryColor(color) };
}

/** Delikatne tło panelu (np. wybrana kategoria w kreatorze). */
export function categoryColorSurfaceStyle(color: string | null | undefined): CSSProperties {
  const hex = resolveCategoryColor(color);
  return {
    borderColor: `${hex}4d`,
    backgroundColor: `${hex}1a`,
  };
}

export type CategoryColorChipVariant = "emerald" | "blue";

const CHIP_VARIANT_SELECTED: Record<CategoryColorChipVariant, string> = {
  emerald:
    "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  blue: "bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 text-blue-700 dark:text-blue-300",
};

/** Klasy chipa wyboru kategorii — z kolorem słownika lub fallbackiem wariantu UI. */
export function categoryColorChipClassName(
  selected: boolean,
  color: string | null | undefined,
  fallbackVariant: CategoryColorChipVariant = "emerald"
): string {
  const base = "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors";
  if (!selected) return `${base} ${CHIP_UNSELECTED_CLASS}`;
  const trimmed = typeof color === "string" ? color.trim() : "";
  if (trimmed) return base;
  return `${base} ${CHIP_VARIANT_SELECTED[fallbackVariant]}`;
}

/** Style inline chipa — tylko gdy zaznaczony i kategoria ma kolor w słowniku. */
export function categoryColorChipStyle(
  selected: boolean,
  color: string | null | undefined
): CSSProperties | undefined {
  if (!selected) return undefined;
  const trimmed = typeof color === "string" ? color.trim() : "";
  if (!trimmed) return undefined;
  return categoryColorBadgeStyle(color);
}

export const CATEGORY_COLOR_BADGE_BASE_CLASS = "rounded-md border font-semibold";

export const CATEGORY_COLOR_BADGE_SIZE_CLASS = {
  /** Pełna nazwa kategorii na karcie zlecenia (stała wysokość, jedna linia + ellipsis). */
  cardCategory:
    "inline-flex h-6 w-[5.25rem] max-w-[5.25rem] shrink-0 items-center justify-center px-1",
  /** Skrót inicjałów (legacy / inne widoki). */
  abbrev:
    "inline-flex min-w-[5.25rem] h-8 items-center justify-center px-2 text-[1.875rem] leading-none font-bold uppercase tracking-wide",
  xs: "inline-flex min-w-[1.75rem] items-center justify-center px-1 py-0 text-[10px] font-bold uppercase tracking-wide",
  sm: "px-2 py-0.5 text-[10px] uppercase tracking-wider",
  md: "px-2 py-0.5 text-xs",
} as const;

/** Skrót nazwy kategorii: „Utrzymanie Ruchu” → „UR”, „Załadunek” → „ZA”. */
export function categoryAbbreviation(name: string, maxLetters = 4): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const firstLetter = (word: string) => {
    const m = word.match(/[\p{L}\p{N}]/u);
    return m ? m[0] : "";
  };

  if (words.length === 1) {
    const letters = words[0].replace(/[^\p{L}\p{N}]/gu, "");
    return letters.slice(0, 2).toUpperCase() || "?";
  }

  return words
    .map(firstLetter)
    .join("")
    .toUpperCase()
    .slice(0, maxLetters);
}
