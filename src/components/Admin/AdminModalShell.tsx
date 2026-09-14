"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useDictionary } from "@/i18n";
import { INLINE_SCROLL_PANEL_CLASS } from "@/components/scrollPanelStyles";
import { cn } from "@/lib/cn";
import {
  MODAL_CLOSE_BTN,
  MODAL_FOOTER,
  MODAL_HEADER,
  MODAL_PANEL,
  OVERLAY_BACKDROP,
  OVERLAY_HOST,
} from "@/lib/uiChrome";
import { MODAL_TITLE, MODAL_TITLE_SM } from "@/lib/uiTypography";

/**
 * Standardowy modal admin (tło + panel + nagłówek z zamknięciem).
 * Treść (np. `<form>`) przekazuj jako `children` — bez dodatkowego owijania nagłówka.
 *
 * `scrollableBody` — `max-h-[90vh]` na panelu + treść w przewijalnej strefie (`flex-1 min-h-0 overflow-y-auto`).
 * `footer` — opcjonalna belka pod treścią (np. akcje); razem ze `scrollableBody` trzyma stopkę widoczną przy długiej treści.
 * `closeOnBackdropClick` — domyślnie true; false = zamknięcie tylko przez X / Anuluj / po zapisie.
 */
export function AdminModalShell({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-sm",
  titleSize = "sm",
  scrollableBody = false,
  closeOnBackdropClick = true,
  footer,
  footerClassName,
  zIndexClass = "z-[100]",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
  titleSize?: "sm" | "lg";
  scrollableBody?: boolean;
  closeOnBackdropClick?: boolean;
  footer?: ReactNode;
  footerClassName?: string;
  /** Warstwa nad mapą Leaflet itd. — worker: `z-[9999]`. */
  zIndexClass?: string;
}) {
  const closeLabel = useDictionary().admin.ui.closeModal;

  if (!open) return null;
  const titleClass = titleSize === "lg" ? MODAL_TITLE : MODAL_TITLE_SM;
  const iconClass = titleSize === "lg" ? "h-5 w-5" : "h-4 w-4";
  const tall = scrollableBody || footer != null;

  const body = tall ? (
    <div className="flex min-h-0 flex-1 flex-col">
      {scrollableBody ? (
        <div className={`min-h-0 flex-1 ${INLINE_SCROLL_PANEL_CLASS}`}>{children}</div>
      ) : (
        children
      )}
      {footer != null ? <div className={cn(MODAL_FOOTER, footerClassName)}>{footer}</div> : null}
    </div>
  ) : (
    children
  );

  return (
    <div className={cn(OVERLAY_HOST, zIndexClass)}>
      <div
        className={OVERLAY_BACKDROP}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden
      />
      <div className={cn(MODAL_PANEL, maxWidthClass, tall && "max-h-[90vh]")}>
        <div className={MODAL_HEADER}>
          <h2 className={titleClass}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={MODAL_CLOSE_BTN}
            aria-label={closeLabel}
          >
            <X className={iconClass} />
          </button>
        </div>
        {body}
      </div>
    </div>
  );
}
