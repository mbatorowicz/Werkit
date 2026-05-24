"use client";

import { Loader2 } from "lucide-react";

export function WorkerClientLoading({ message }: { message: string }) {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      <p className="mt-4 text-sm text-zinc-500">{message}</p>
    </div>
  );
}
