"use client";

import { Trash2 } from "lucide-react";
import { useAppDialog } from "@/components/AppDialogProvider";
import { cn } from "@/lib/cn";
import { BTN_DANGER_SOFT } from "@/lib/uiButtons";

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
      className={cn(BTN_DANGER_SOFT, "w-full py-3 active:scale-[0.98]")}
    >
      <Trash2 className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}
