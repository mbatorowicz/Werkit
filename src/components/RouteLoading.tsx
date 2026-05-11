import { Loader2 } from "lucide-react";

export function RouteLoading({
  title = "Ładowanie…",
  subtitle = "Przechodzę do następnego widoku",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center px-6 py-10">
      {/* top progress bar */}
      <div className="fixed left-0 top-0 z-[200] h-0.5 w-full overflow-hidden bg-transparent">
        <div className="h-full w-1/3 bg-emerald-500 animate-[routebar_0.9s_ease-in-out_infinite]" />
      </div>

      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate">{subtitle}</div>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <div className="h-3 w-3/4 rounded bg-zinc-200/70 dark:bg-zinc-800 animate-pulse" />
          <div className="h-3 w-full rounded bg-zinc-200/50 dark:bg-zinc-800/80 animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-zinc-200/60 dark:bg-zinc-800/70 animate-pulse" />
        </div>
      </div>

      <style>{`
        @keyframes routebar {
          0% { transform: translateX(-60%); opacity: .4; }
          50% { opacity: 1; }
          100% { transform: translateX(260%); opacity: .6; }
        }
      `}</style>
    </div>
  );
}

