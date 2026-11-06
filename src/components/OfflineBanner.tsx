"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { offlineActionQueue } from "@/lib/offlineActionQueue";
import { useDictionary } from "@/components/LocaleProvider";
import { formatDict } from "@/i18n";
import type { OfflineAction } from "@/lib/offlineActionQueue";
import { useAppDialog } from "@/components/AppDialogProvider";

/**
 * Banner offline wyświetlany w worker shell gdy brak połączenia.
 * Pokazuje liczbę oczekujących operacji do wysłania.
 */
export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const dict = useDictionary();
  const [pendingCount, setPendingCount] = useState(0);
  const [actions, setActions] = useState<OfflineAction[]>([]);
  const { confirm } = useAppDialog();

  useEffect(() => {
    let cancelled = false;

    const checkPending = async () => {
      if (cancelled) return;
      const count = await offlineActionQueue.getCount();
      const queued = await offlineActionQueue.getAll();
      if (!cancelled) setActions(queued);
      if (!cancelled) setPendingCount(count);
    };

    void checkPending();
    const interval = setInterval(checkPending, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOnline]);

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full bg-amber-500/90 px-4 py-2 text-center text-sm font-medium text-amber-950 backdrop-blur-sm"
    >
      <span className="inline-flex items-center gap-2">
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 010-1.414M3 3l18 18"
          />
        </svg>
        {isOnline ? dict.worker.client.offlineConflictTitle : dict.worker.client.offlineBanner}
        {pendingCount > 0 && (
          <span className="ml-1 rounded bg-amber-600/50 px-1.5 py-0.5 text-xs tabular-nums">
            {formatDict(dict.worker.client.offlinePendingCount, { count: pendingCount })}
          </span>
        )}
      </span>
      {actions
        .filter(
          (action) =>
            action.protocolVersion !== 2 ||
            action.retryCount >= action.maxRetries ||
            typeof action.payload.sessionId !== "number"
        )
        .map((action) => (
          <div key={action.id} className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <span>
              {formatDict(dict.worker.client.offlineOperationLabel, {
                session: String(action.payload.sessionId ?? "—"),
                type: dict.worker.client[`offlineAction_${action.type}`],
              })}
            </span>
            <button
              type="button"
              disabled={action.protocolVersion !== 2}
              onClick={async () => {
                await offlineActionQueue.updateRetry(action.id, 0);
                await offlineActionQueue.flushAll();
              }}
            >
              {dict.worker.client.offlineRetry}
            </button>
            <button
              type="button"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(action, null, 2)], { type: "application/json" })
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = `werkit-${action.id}.json`;
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              {dict.worker.client.offlineExport}
            </button>
            <button
              type="button"
              onClick={async () => {
                if (
                  await confirm({
                    message: dict.worker.client.offlineDiscardConfirm,
                    variant: "danger",
                  })
                )
                  await offlineActionQueue.remove(action.id);
              }}
            >
              {dict.worker.client.offlineDiscard}
            </button>
          </div>
        ))}
    </div>
  );
}
