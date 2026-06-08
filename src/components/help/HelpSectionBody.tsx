import type { HelpSection } from "@/types/help";

export function HelpSectionBody({ section }: { section: HelpSection }) {
  return (
    <>
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
    </>
  );
}
