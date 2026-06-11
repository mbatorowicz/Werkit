"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { BTN_PRIMARY_FULL, BTN_SECONDARY_FULL } from "@/lib/uiButtons";
import { useDictionary } from "@/components/LocaleProvider";

/** Standardowa stopka modala formularza: Anuluj + Zapisz (opcjonalnie dodatkowe akcje nad rzędem). */
export function FormModalFooter({
  formId,
  onCancel,
  submitLabel,
  cancelLabel,
  isSubmitting = false,
  submitDisabled = false,
  submitClassName = BTN_PRIMARY_FULL,
  cancelClassName = BTN_SECONDARY_FULL,
  leading,
  hideSubmit = false,
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
  hideSubmit?: boolean;
}) {
  const dict = useDictionary();
  const cancel = cancelLabel ?? dict.admin.ui.modalCancel;

  return (
    <div className="w-full space-y-2">
      {leading ? <div className="flex flex-col gap-2 pb-1">{leading}</div> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:items-center">
        <button type="button" onClick={onCancel} className={cancelClassName}>
          {cancel}
        </button>
        {!hideSubmit ? (
          <button
            type="submit"
            form={formId}
            disabled={isSubmitting || submitDisabled}
            className={submitClassName}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : submitLabel}
          </button>
        ) : null}
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
  const dict = useDictionary();
  const cancel = cancelLabel ?? dict.admin.ui.modalCancel;

  return (
    <div className="flex w-full flex-col gap-2">
      {children}
      <button type="button" onClick={onCancel} className={`w-full ${BTN_SECONDARY_FULL}`}>
        {cancel}
      </button>
    </div>
  );
}
