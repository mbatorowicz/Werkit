import type { MouseEvent } from "react";

/** Zatrzymuje propagację kliknięcia z przycisków w wierszu (edycja, usuwanie, chevron). */
export function stopRowActionClick(e: MouseEvent): void {
  e.stopPropagation();
}
