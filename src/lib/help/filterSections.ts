import type { HelpPageContent, HelpSection } from "@/types/help";

/** Zwraca sekcje pomocy z pominięciem identyfikatorów z listy wykluczeń. */
export function filterHelpSections(
  sections: HelpSection[],
  excludeIds?: string[]
): HelpSection[] {
  if (!excludeIds?.length) return sections;
  const excluded = new Set(excludeIds);
  return sections.filter((section) => !excluded.has(section.id));
}

/** Filtruje sekcje w obiekcie treści pomocy (bez mutacji wejścia). */
export function applyHelpSectionExclusions(
  content: HelpPageContent,
  excludeIds?: string[]
): HelpPageContent {
  if (!excludeIds?.length) return content;
  return {
    ...content,
    sections: filterHelpSections(content.sections, excludeIds),
  };
}
