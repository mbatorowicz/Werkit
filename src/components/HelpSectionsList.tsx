import type { HelpSection } from "@/types/help";
import { HelpAccordion } from "@/components/HelpAccordion";
import { getHelpSectionIcon } from "@/components/helpSectionIcons";

type HelpScope = "worker" | "admin" | "platform";

export function HelpSectionsList({
  sections,
  scope,
  excludeIds,
}: {
  sections: HelpSection[];
  scope: HelpScope;
  excludeIds?: string[];
}) {
  const excluded = new Set(excludeIds ?? []);
  const visible = sections.filter((s) => !excluded.has(s.id));

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
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mb-2 last:mb-0">
                {paragraph}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 mt-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </HelpAccordion>
        );
      })}
    </div>
  );
}
