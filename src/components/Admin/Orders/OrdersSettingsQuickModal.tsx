"use client";

import { Loader2, Settings } from "lucide-react";
import SettingsForm, { type SettingsSnapshot } from "@/app/admin/settings/SettingsForm";
import { AdminModalShell } from "@/components/Admin/AdminModalShell";
import { getDictionary } from "@/i18n";

export function OrdersSettingsQuickModal({
  isOpen,
  onClose,
  settingsData,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  settingsData: unknown;
  title: string;
}) {
  const uiDict = getDictionary().admin.ui;

  return (
    <AdminModalShell
      open={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-500" />
          {title}
        </span>
      }
      maxWidthClass="max-w-4xl"
      titleSize="lg"
      scrollableBody
      closeOnBackdropClick={false}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto sm:ml-auto px-5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-600 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
        >
          {uiDict.modalCancel}
        </button>
      }
    >
      <div className="p-2">
        {settingsData ? (
          <SettingsForm initialData={settingsData as SettingsSnapshot} mode="orders" />
        ) : (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          </div>
        )}
      </div>
    </AdminModalShell>
  );
}
