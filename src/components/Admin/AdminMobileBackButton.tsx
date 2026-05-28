"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Mobile back button for admin panel — uses `router.back()` to navigate
 * to the previous page in history. Only visible on mobile (md:hidden).
 */
export function AdminMobileBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="p-1.5 -ml-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
      aria-label="Wstecz"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
