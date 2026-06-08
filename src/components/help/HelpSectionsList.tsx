import type { HelpSection } from "@/types/help";
import type { HelpScope } from "@/lib/help/constants";
import { filterHelpSections } from "@/lib/help/filterSections";
import { HelpAccordion } from "@/components/help/HelpAccordion";
import { HelpSectionBody } from "@/components/help/HelpSectionBody";
import { getHelpSectionIcon } from "@/components/help/helpSectionIcons";

export function HelpSectionsList({
  sections,
  scope,
  excludeIds,
}: {
  sections: HelpSection[];
  scope: HelpScope;
  excludeIds?: string[];
}) {
  const visible = filterHelpSections(sections, excludeIds);

  return (
    <div className="space-y-3">
      {visible.map((section) => {
        const Icon = getHelpSectionIcon(section.id, scope);
        return (
          <HelpAccordion
            key={section.id}
            title={section.title}
            icon={<Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          >
            <HelpSectionBody section={section} />
          </HelpAccordion>
        );
      })}
    </div>
  );
}
