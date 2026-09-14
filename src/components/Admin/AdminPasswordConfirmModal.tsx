"use client";

import { useEffect, useState } from "react";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { FormModalFooter } from "@/components/FormModalFooter";
import { BTN_DANGER_FULL } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";
import { INPUT_DANGER } from "@/lib/uiTokens";
import { FIELD_LABEL_COMPACT } from "@/lib/uiTypography";
import { useDictionary } from "@/components/LocaleProvider";

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
  const uiDict = useDictionary().admin.ui;
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset password when modal closes
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
          submitClassName={BTN_DANGER_FULL}
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
          <label className={cn(FIELD_LABEL_COMPACT, "mb-1.5")}>
            {uiDict.adminPasswordLabel}
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={uiDict.adminPasswordPlaceholder}
            className={INPUT_DANGER}
          />
        </div>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </form>
    </AdminModalShell>
  );
}
