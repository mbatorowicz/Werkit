"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { getDictionary } from "@/i18n";

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
  if (!open) return null;

  const closeLabel = getDictionary().admin.ui.closeModal;
  const titleClass =
    titleSize === "lg"
      ? "text-lg font-semibold text-zinc-900 dark:text-white"
      : "text-base font-semibold text-zinc-900 dark:text-white";
  const iconClass = titleSize === "lg" ? "h-5 w-5" : "h-4 w-4";

  const body =
    scrollableBody || footer != null ? (
      <div className="flex min-h-0 flex-1 flex-col">
        {scrollableBody ? (
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">{children}</div>
        ) : (
          children
        )}
        {footer != null ? (
          <div
            className={`shrink-0 border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-[#0a0a0b]/90 ${footerClassName ?? ""}`}
          >
            {footer}
          </div>
        ) : null}
      </div>
    ) : (
      children
    );

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4`}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden
      />
      <div
        className={`relative z-10 flex w-full ${maxWidthClass} flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:border-zinc-700 dark:bg-zinc-900 ${scrollableBody || footer != null ? "max-h-[90vh]" : ""}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-[#0a0a0b]/80">
          <h2 className={titleClass}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 transition hover:text-zinc-900 dark:hover:text-white"
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
