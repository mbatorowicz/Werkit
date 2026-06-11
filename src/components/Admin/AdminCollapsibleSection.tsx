"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function AdminCollapsibleSection({ title, subtitle, defaultOpen = false, children }: Props) {
  const id = useId();
  return (
    <details
      className="group rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      open={defaultOpen}
    >
      <summary
        className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-xl px-5 py-4 select-none hover:bg-zinc-50 dark:hover:bg-zinc-800/30 [&::-webkit-details-marker]:hidden"
        aria-controls={id}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</div>
          ) : null}
        </div>
        <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
      </summary>
      <div id={id} className="px-5 pb-5">
        {children}
      </div>
    </details>
  );
}
