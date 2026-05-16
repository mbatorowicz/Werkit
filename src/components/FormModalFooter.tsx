"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { getDictionary } from "@/i18n";

/** Standardowa stopka modala formularza: Anuluj + Zapisz (opcjonalnie dodatkowe akcje nad rzędem). */
export function FormModalFooter({
  formId,
  onCancel,
  submitLabel,
  cancelLabel,
  isSubmitting = false,
  submitDisabled = false,
  submitClassName = "w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition disabled:opacity-50 flex items-center justify-center min-w-[7rem]",
  cancelClassName = "w-full sm:w-auto px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition",
  leading,
}: {
  formId?: string;
  onCancel: () => void;
  submitLabel: ReactNode;
  cancelLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  submitClassName?: string;
  cancelClassName?: string;
  leading?: ReactNode;
}) {
  const cancel = cancelLabel ?? getDictionary().admin.ui.modalCancel;

  return (
    <div className="w-full space-y-2">
      {leading ? <div className="flex flex-col gap-2 pb-1">{leading}</div> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:items-center">
        <button type="button" onClick={onCancel} className={cancelClassName}>
          {cancel}
        </button>
        <button
          type="submit"
          form={formId}
          disabled={isSubmitting || submitDisabled}
          className={submitClassName}
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : submitLabel}
        </button>
      </div>
    </div>
  );
}

/** Stopka z własnymi przyciskami akcji + Anuluj na dole. */
export function FormModalFooterActions({
  onCancel,
  cancelLabel,
  children,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  children: ReactNode;
}) {
  const cancel = cancelLabel ?? getDictionary().admin.ui.modalCancel;

  return (
    <div className="flex w-full flex-col gap-2">
      {children}
      <button
        type="button"
        onClick={onCancel}
        className="w-full px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
      >
        {cancel}
      </button>
    </div>
  );
}
