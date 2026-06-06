import { getDictionary } from "@/i18n";
import { formatDict } from "@/i18n/format";

export function AdminAppFooter({ companyName }: { companyName: string }) {
  const dict = getDictionary().admin.footer;
  const year = new Date().getFullYear();

  return (
    <footer
      className="shrink-0 border-t border-zinc-200/80 bg-[#f2fbfa]/50 px-6 pt-10 pb-12 dark:border-zinc-800 dark:bg-zinc-900/50 md:pt-12 md:pb-16"
      aria-label={dict.ariaLabel}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 text-center">
        <p className="text-sm font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
          WERKIT
        </p>
        <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400">{dict.tagline}</p>
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
          {formatDict(dict.copyright, { year: String(year), company: companyName })}
        </p>
      </div>
    </footer>
  );
}
