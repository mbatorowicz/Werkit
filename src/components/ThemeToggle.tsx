"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useDictionary } from "@/components/LocaleProvider";
import { cn } from "@/lib/cn";

export function ThemeToggle({ size = "sm" }: { size?: "sm" | "md" }) {
  const { theme, setTheme } = useTheme();
  const dict = useDictionary();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const boxClass = size === "md" ? "min-h-11 min-w-11" : "w-9 h-9";

  if (!mounted) {
    return <div className={cn(boxClass, "opacity-0")} aria-hidden="true" />;
  }

  const isDark = theme === "dark";
  const label = isDark ? dict.common.theme.switchToLight : dict.common.theme.switchToDark;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        boxClass,
        "flex items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-emerald-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-emerald-400"
      )}
      title={label}
      aria-label={label}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
