"use client";

import type { ComponentProps } from "react";
import { UserPlus } from "lucide-react";
import { WorkerPendingOrdersSection } from "./WorkerPendingOrdersSection";
import { WorkerDelegateOrderModal } from "../delegation/WorkerDelegateOrderModal";

type Props = ComponentProps<typeof WorkerPendingOrdersSection> & {
  hasDelegationRights: boolean;
  delegateModalOpen: boolean;
  setDelegateModalOpen: (open: boolean) => void;
  onDelegateSuccess: () => void;
};

export function WorkerIdleSection({
  hasDelegationRights,
  delegateModalOpen,
  setDelegateModalOpen,
  onDelegateSuccess,
  ...pendingOrdersProps
}: Props) {
  return (
    <>
      {hasDelegationRights ? (
        <button
          type="button"
          onClick={() => setDelegateModalOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          {pendingOrdersProps.dict.delegateOrderButton}
        </button>
      ) : null}
      <WorkerPendingOrdersSection {...pendingOrdersProps} />
      <WorkerDelegateOrderModal
        open={delegateModalOpen}
        onClose={() => setDelegateModalOpen(false)}
        onSuccess={onDelegateSuccess}
      />
    </>
  );
}
