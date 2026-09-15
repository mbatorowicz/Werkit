"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/i18n";
import { cn } from "@/lib/cn";
import { ICON_BTN_GHOST } from "@/lib/uiChrome";

/**
 * Mobile back button for admin panel — uses `router.back()` to navigate
 * to the previous page in history. Only visible on mobile (md:hidden).
 */
export function AdminMobileBackButton() {
  const router = useRouter();
  const dict = useDictionary().admin.ui;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={cn(ICON_BTN_GHOST, "-ml-1")}
      aria-label={dict.back}
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  );
}
