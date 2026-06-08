/** Wygląd scrollbara (patrz `.custom-scrollbar` w globals.css) — bez overscroll. */
export const CUSTOM_SCROLLBAR_CLASS = "custom-scrollbar";

/**
 * Pionowy panel listy (layout admin/worker, modale, comboboxy).
 * `overscroll-y-contain` — zagnieżdżone listy nie „przenoszą” scrolla na body.
 */
export const VERTICAL_SCROLL_PANEL_CLASS = [
  "overflow-y-auto overscroll-y-contain touch-pan-y",
  CUSTOM_SCROLLBAR_CLASS,
].join(" ");

/**
 * Poziomy scroll tabel / Gantta.
 * `overscroll-y-auto` — kółko myszy w pionie przechodzi do rodzica (scroll strony).
 */
export const HORIZONTAL_SCROLL_PANEL_CLASS = [
  "overflow-x-auto overscroll-x-contain overscroll-y-auto touch-pan-x",
  CUSTOM_SCROLLBAR_CLASS,
].join(" ");
