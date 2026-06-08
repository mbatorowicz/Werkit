import { ArrowLeft, BookOpen, PhoneCall, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { HelpPageContent } from "@/types/help";
import { HelpSectionsList } from "@/components/HelpSectionsList";
import { HelpGlossary } from "@/components/HelpGlossary";

type HelpScope = "worker" | "admin" | "platform";

export function HelpPageShell({
  content,
  backHref,
  scope,
  phone,
  excludeSectionIds,
}: {
  content: HelpPageContent;
  backHref: string;
  scope: HelpScope;
  phone?: string;
  excludeSectionIds?: string[];
}) {
  return (
    <div className={scope === "worker" ? "py-6 pb-20" : "py-6"}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-semibold">{content.backLabel}</span>
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
        <BookOpen className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
        {content.title}
      </h1>

      {content.intro && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
          {content.intro}
        </p>
      )}

      {content.contact && phone && (
        <div className="space-y-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3">
              {content.contact.quickContact}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-300 text-sm mb-4">
              {content.contact.contactDesc}
            </p>
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
              {content.contact.callDispatcher}
            </a>
          </div>
        </div>
      )}

      {content.userManual && (
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">
          {content.userManual}
        </h2>
      )}

      <HelpSectionsList
        sections={content.sections}
        scope={scope}
        excludeIds={excludeSectionIds}
      />

      {content.glossary && <HelpGlossary glossary={content.glossary} />}

      {content.emergency && (
        <div className="mt-8 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {content.emergency.title}
          </h2>
          <p className="text-xs text-orange-800 dark:text-orange-300">{content.emergency.body}</p>
        </div>
      )}
    </div>
  );
}
