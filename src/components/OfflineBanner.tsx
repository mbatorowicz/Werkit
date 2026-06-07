"use client";

import { useEffect, useState } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { offlineActionQueue } from "@/lib/offlineActionQueue";
import { useDictionary } from "@/components/LocaleProvider";
import { formatDict } from "@/i18n";

/**
 * Banner offline wyświetlany w worker shell gdy brak połączenia.
 * Pokazuje liczbę oczekujących operacji do wysłania.
 */
export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const dict = useDictionary();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (isOnline) return;

    let cancelled = false;

    const checkPending = async () => {
      if (cancelled) return;
      const count = await offlineActionQueue.getCount();
      if (!cancelled) setPendingCount(count);
    };

    void checkPending();
    const interval = setInterval(checkPending, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isOnline]);

  if (isOnline) return null;

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
        {dict.worker.client.offlineBanner}
        {pendingCount > 0 && (
          <span className="ml-1 rounded bg-amber-600/50 px-1.5 py-0.5 text-xs tabular-nums">
            {formatDict(dict.worker.client.offlinePendingCount, { count: pendingCount })}
          </span>
        )}
      </span>
    </div>
  );
}
