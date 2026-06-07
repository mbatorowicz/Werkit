"use client";

import type { ReactNode } from "react";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { useDictionary } from "@/components/LocaleProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  canEdit?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  maxWidthClass?: string;
};

export function AdminPreviewModal({
  open,
  onClose,
  title,
  children,
  canEdit = false,
  onEdit,
  editLabel,
  maxWidthClass = "max-w-lg",
}: Props) {
  const ui = useDictionary().admin.ui;

  return (
    <AdminModalShell
      open={open}
      onClose={onClose}
      title={title}
      maxWidthClass={maxWidthClass}
      titleSize="lg"
      scrollableBody
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {ui.modalCancel}
          </button>
          {canEdit && onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className={BTN_PRIMARY_COMPACT}
            >
              {editLabel ?? ui.previewEdit}
            </button>
          ) : null}
        </div>
      }
    >
      <dl className="space-y-4 p-6">{children}</dl>
    </AdminModalShell>
  );
}
