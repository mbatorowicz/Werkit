import { PhoneCall } from "lucide-react";
import type { HelpContactBlock } from "@/types/help";

export function HelpContactCard({
  contact,
  phone,
}: {
  contact: HelpContactBlock;
  phone: string;
}) {
  return (
    <div className="space-y-4 mb-8">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">
          {contact.quickContact}
        </h2>
        <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-4">{contact.contactDesc}</p>
        <div className="mb-4 text-center">
          <span className="text-2xl font-black text-zinc-800 dark:text-white tracking-wide">
            {phone}
          </span>
        </div>
        <a
          href={`tel:${phone}`}
          className="w-full bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-4 flex items-center justify-center gap-3 transition-colors font-medium"
        >
          <PhoneCall className="w-5 h-5" />
          {contact.callDispatcher}
        </a>
      </div>
    </div>
  );
}
