import { Download, Smartphone } from 'lucide-react';
import type { AndroidAppDownloadInfo } from '@/lib/androidAppDownload';
import { APP_VERSION } from '@/lib/version';
import { getDictionary, formatDict } from '@/i18n';

type Props = {
  download: AndroidAppDownloadInfo;
};

export function AppDownloadCard({ download }: Props) {
  const dict = getDictionary().admin.settings;

  return (
    <section className="mb-8 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-950/50 flex items-start gap-3">
        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 shrink-0">
          <Smartphone className="w-5 h-5" aria-hidden />
        </div>
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-white">{dict.appDownloadTitle}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{dict.appDownloadDesc}</p>
        </div>
      </div>
      <div className="p-6 md:p-8">
        {download.available ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <a
              href={download.href}
              download={download.fileName}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4 shrink-0" aria-hidden />
              {dict.appDownloadButton}
            </a>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {formatDict(dict.appDownloadVersion, { version: APP_VERSION })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-lg px-4 py-3">
            {dict.appDownloadUnavailable}
          </p>
        )}
        <p className="mt-4 text-xs text-zinc-500 leading-relaxed">{dict.appDownloadHint}</p>
      </div>
    </section>
  );
}
