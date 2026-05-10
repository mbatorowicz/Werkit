import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function ReportStatCard({
  icon: Icon,
  iconWrapClass,
  title,
  value,
}: {
  icon: LucideIcon;
  iconWrapClass: string;
  title: string;
  value: ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-lg ${iconWrapClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <h3 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">{title}</h3>
      <div className="text-3xl font-bold text-zinc-900 dark:text-white mt-1">{value}</div>
    </div>
  );
}
