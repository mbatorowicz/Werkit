import { AlertTriangle } from "lucide-react";
import type { HelpEmergency } from "@/types/help";

export function HelpEmergencyCard({ emergency }: { emergency: HelpEmergency }) {
  return (
    <div className="mt-8 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-5 shadow-sm">
      <h2 className="text-sm font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> {emergency.title}
      </h2>
      <p className="text-xs text-orange-800 dark:text-orange-300">{emergency.body}</p>
    </div>
  );
}
