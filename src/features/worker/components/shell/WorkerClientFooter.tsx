"use client";

export function WorkerClientFooter() {
  return (
    <div className="mt-4 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-400 opacity-60 dark:text-zinc-500">
      Werkit v{process.env.APP_VERSION ?? "0.0.0"}
    </div>
  );
}
