"use client";

import { Loader2, Settings, X } from "lucide-react";
import SettingsForm, { type SettingsSnapshot } from "@/app/admin/settings/SettingsForm";

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-500" /> {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-2">
          {settingsData ? (
            <SettingsForm initialData={settingsData as SettingsSnapshot} mode="orders" />
          ) : (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
