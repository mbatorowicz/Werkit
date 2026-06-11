"use client";

import type { AppDictionary } from "@/i18n/types";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";

const BIOMETRIC_FORM_ID = "worker-biometric-pwd-form";

export function BiometricPasswordModal({
  dict,
  open,
  busy,
  pwd,
  setPwd,
  onClose,
  onSubmit,
}: {
  dict: AppDictionary["worker"]["profile"];
  open: boolean;
  busy: boolean;
  pwd: string;
  setPwd: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={dict.biometricConfirmTitle}
      maxWidthClass="max-w-sm"
      titleSize="lg"
      zIndexClass="z-[9999]"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId={BIOMETRIC_FORM_ID}
          onCancel={onClose}
          cancelLabel={dict.biometricCancel}
          submitLabel={busy ? "…" : dict.biometricConfirmSave}
          isSubmitting={busy}
          submitDisabled={!pwd.trim()}
        />
      }
    >
      <form
        id={BIOMETRIC_FORM_ID}
        className="space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <p className="text-xs text-zinc-500">{dict.biometricConfirmHint}</p>
        <input
          type="password"
          autoComplete="current-password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder={dict.biometricPasswordPlaceholder}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </form>
    </AdminModalShell>
  );
}
