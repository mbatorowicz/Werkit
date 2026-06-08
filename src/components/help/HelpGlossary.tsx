import type { HelpGlossary as HelpGlossaryType } from "@/types/help";

export function HelpGlossary({ glossary }: { glossary: HelpGlossaryType }) {
  return (
    <div className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 px-1">
        {glossary.title}
      </h2>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <tbody>
            {glossary.terms.map((row, index) => (
              <tr
                key={row.term}
                className={
                  index > 0 ? "border-t border-zinc-200 dark:border-zinc-700" : undefined
                }
              >
                <th className="text-left align-top p-4 font-bold text-zinc-900 dark:text-zinc-100 w-1/3">
                  {row.term}
                </th>
                <td className="p-4 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {row.definition}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
