"use client";

import type { ReactNode } from "react";
import { INLINE_SCROLL_X_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { cn } from "@/lib/cn";
import { TABLE_BASE, TABLE_CARD } from "@/lib/uiTable";

type Props = {
  children: ReactNode;
  /** Minimalna szerokość tabeli w px (scroll poziomy). */
  minWidthClass?: string;
  className?: string;
};

/** Obudowa tabeli admin — karta + poziomy scroll. */
export function AdminTableShell({ children, minWidthClass, className }: Props) {
  return (
    <div className={cn(TABLE_CARD, className)}>
      <div className={INLINE_SCROLL_X_PANEL_CLASS}>
        <table className={cn(TABLE_BASE, minWidthClass)}>{children}</table>
      </div>
    </div>
  );
}
