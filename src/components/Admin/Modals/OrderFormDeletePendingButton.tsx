"use client";

import { Trash2 } from "lucide-react";
import { useAppDialog } from "@/components/AppDialogProvider";

interface OrderFormDeletePendingButtonProps {
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  confirmMessage: string;
  label: string;
  onDeletePending: () => Promise<void>;
}

export function OrderFormDeletePendingButton({
  isSubmitting,
  setIsSubmitting,
  confirmMessage,
  label,
  onDeletePending,
}: OrderFormDeletePendingButtonProps) {
  const { confirm: appConfirm } = useAppDialog();

  return (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={async () => {
        const msg = confirmMessage;
        if (!msg || !(await appConfirm({ message: msg, variant: "danger" }))) return;
        setIsSubmitting(true);
        try {
          await onDeletePending();
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-500/10 py-3 font-semibold text-red-700 transition hover:bg-red-500/15 active:scale-[0.98] disabled:opacity-50 dark:border-red-500/30 dark:text-red-400"
    >
      <Trash2 className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}
