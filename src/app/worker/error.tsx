"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function WorkerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Worker Route Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
      <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4">
        <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
        Wystąpił błąd ładowania
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm">
        Niestety, wystąpił problem podczas ładowania panelu pracownika. Spróbuj odświeżyć stronę lub zalogować się ponownie.
      </p>
      <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg w-full max-w-md mb-6 overflow-auto text-left">
        <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words">
          {error.message || "Brak szczegółów błędu (Error.message is empty)"}
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Spróbuj ponownie
        </button>
        <button
          onClick={() => window.location.href = '/login'}
          className="bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Wróć do logowania
        </button>
      </div>
    </div>
  );
}
