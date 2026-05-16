"use client";

import { useEffect, useState } from "react";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { getDictionary } from "@/i18n";

const FORM_ID = "admin-password-confirm-form";

export function AdminPasswordConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  isSubmitting = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
}) {
  const uiDict = getDictionary().admin.ui;
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setPassword("");
    }
  }, [open]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <AdminModalShell
      open={open}
      onClose={handleClose}
      title={title}
      maxWidthClass="max-w-md"
      titleSize="lg"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <FormModalFooter
          formId={FORM_ID}
          onCancel={handleClose}
          submitLabel={confirmLabel}
          isSubmitting={isSubmitting}
          submitDisabled={!password.trim()}
          submitClassName="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition disabled:opacity-50 flex items-center justify-center min-w-[7rem]"
        />
      }
    >
      <form
        id={FORM_ID}
        className="space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!password.trim() || isSubmitting) return;
          void onConfirm(password);
        }}
      >
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {uiDict.adminPasswordLabel}
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={uiDict.adminPasswordPlaceholder}
            className="w-full rounded-lg border border-zinc-200 bg-[#f2fbfa] px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-red-500 focus:ring-1 focus:ring-red-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          />
        </div>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </form>
    </AdminModalShell>
  );
}
