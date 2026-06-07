"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { useDictionary } from "@/components/LocaleProvider";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/lib/uiButtons";

export default function WorkerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = useDictionary();

  useEffect(() => {
    console.error("Worker Route Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
        <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        {dict.common.errors.pageLoad}
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">
        {dict.common.errors.pageLoadHint}
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => {
            if (error.message && error.message.toLowerCase().includes("chunk")) {
              window.location.reload();
            } else {
              reset();
            }
          }}
          className={BTN_PRIMARY}
        >
          {dict.common.actions.retry}
        </button>
        <button
          onClick={() => {
            window.location.href = "/login";
          }}
          className={BTN_SECONDARY}
        >
          {dict.common.actions.goToLogin}
        </button>
      </div>
    </div>
  );
}
