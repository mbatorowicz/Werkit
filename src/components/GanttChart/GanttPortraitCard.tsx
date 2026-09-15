"use client";

import { Maximize2 } from "lucide-react";
import { CARD } from "@/lib/uiTokens";
import { BTN_PRIMARY_FULL } from "@/lib/uiButtons";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  body: string;
  openLabel: string;
  onOpen: () => void;
};

export function GanttPortraitCard({ title, body, openLabel, onOpen }: Props) {
  return (
    <div className={cn(CARD, "mb-6 p-4")}>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
      <button type="button" onClick={onOpen} className={cn(BTN_PRIMARY_FULL, "mt-4")}>
        <Maximize2 className="h-4 w-4" />
        {openLabel}
      </button>
    </div>
  );
}
