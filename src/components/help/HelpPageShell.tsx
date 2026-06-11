import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import type { HelpPageViewModel } from "@/lib/help/loadHelpPage";
import { HELP_PAGE_FRAME_CLASS } from "@/lib/help/constants";
import { HelpSectionsList } from "@/components/help/HelpSectionsList";
import { HelpGlossary } from "@/components/help/HelpGlossary";
import { HelpContactCard } from "@/components/help/HelpContactCard";
import { HelpEmergencyCard } from "@/components/help/HelpEmergencyCard";

export function HelpPageShell({
  content,
  backHref,
  scope,
  phone,
  excludeSectionIds,
}: HelpPageViewModel) {
  return (
    <div className={HELP_PAGE_FRAME_CLASS[scope]}>
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

      {content.contact && phone && <HelpContactCard contact={content.contact} phone={phone} />}

      {content.userManual && (
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">
          {content.userManual}
        </h2>
      )}

      <HelpSectionsList sections={content.sections} scope={scope} excludeIds={excludeSectionIds} />

      {content.glossary && <HelpGlossary glossary={content.glossary} />}

      {content.emergency && <HelpEmergencyCard emergency={content.emergency} />}
    </div>
  );
}
