/** Zakres ekranu pomocy — worker, admin lub platform. */
export type HelpScope = "worker" | "admin" | "platform";

/** Domyślny numer awaryjny, gdy brak telefonu w ustawieniach firmy. */
export const DEFAULT_HELP_PHONE = "112";

/** Sekcje warunkowe modułu DUR do ukrycia, gdy `durEnabled === false`. */
export const DUR_SECTION_BY_SCOPE: Record<Exclude<HelpScope, "platform">, string> = {
  worker: "dur-parts",
  admin: "dur-warehouse",
};

/** Klasy kontenera strony pomocy per zakres. */
export const HELP_PAGE_FRAME_CLASS: Record<HelpScope, string> = {
  worker: "py-6 pb-20",
  admin: "p-6 md:p-8 max-w-3xl mx-auto w-full py-6",
  platform: "py-6",
};
