"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { getDictionary } from "@/i18n";

/**
 * Standardowy modal admin (tło + panel + nagłówek z zamknięciem).
 * Treść (np. `<form>`) przekazuj jako `children` — bez dodatkowego owijania nagłówka.
 */
export function AdminModalShell({
  open,
  onClose,
  title,
  children,
  maxWidthClass = "max-w-sm",
  titleSize = "sm",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  maxWidthClass?: string;
  titleSize?: "sm" | "lg";
}) {
  if (!open) return null;

  const closeLabel = getDictionary().admin.ui.closeModal;
  const titleClass =
    titleSize === "lg"
      ? "text-lg font-semibold text-zinc-900 dark:text-white"
      : "text-base font-semibold text-zinc-900 dark:text-white";
  const iconClass = titleSize === "lg" ? "h-5 w-5" : "h-4 w-4";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={`relative z-10 flex w-full ${maxWidthClass} flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:border-zinc-700 dark:bg-zinc-900`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-[#0a0a0b]/80">
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
        {children}
      </div>
    </div>
  );
}
