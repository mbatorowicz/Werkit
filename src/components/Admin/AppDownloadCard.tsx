"use client";

import { Download, Smartphone } from "lucide-react";
import type { AndroidAppDownloadInfo } from "@/lib/androidAppDownload";
import { APP_VERSION } from "@/lib/version";
import { useDictionary, formatDict, formatUiDateTimeShort } from "@/i18n";
import { cn } from "@/lib/cn";
import { BTN_PRIMARY_COMPACT } from "@/lib/uiButtons";
import { ACCENT_ICON_WRAP, ALERT_WARNING } from "@/lib/uiChrome";
import { CARD } from "@/lib/uiTokens";

type Props = {
  download: AndroidAppDownloadInfo;
};

export function AppDownloadCard({ download }: Props) {
  const dict = useDictionary().admin.settings;

  return (
    <section className={cn(CARD, "mb-8 overflow-hidden")}>
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-950/50 flex items-start gap-3">
        <div className={ACCENT_ICON_WRAP}>
          <Smartphone className="w-5 h-5" aria-hidden />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-zinc-900 dark:text-white">{dict.appDownloadTitle}</h2>
          {download.available && download.buildType === "debug" ? (
            <span className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">
              {dict.appDownloadDebugBadge}
            </span>
          ) : null}
        </div>
      </div>
      <div className="p-6 md:p-8">
        {download.available ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <a
                href={download.href}
                download={download.fileName}
                className={BTN_PRIMARY_COMPACT}
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden />
                {dict.appDownloadButton}
              </a>
              <div className="text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
                <p>{formatDict(dict.appDownloadWebVersion, { version: APP_VERSION })}</p>
                {download.apkVersion ? (
                  <p>{formatDict(dict.appDownloadApkVersion, { version: download.apkVersion })}</p>
                ) : null}
                {download.builtAt ? (
                  <p>
                    {formatDict(dict.appDownloadBuiltAt, {
                      date: formatUiDateTimeShort(download.builtAt),
                    })}
                  </p>
                ) : null}
              </div>
            </div>
            {!download.inSync ? (
              <p className={ALERT_WARNING}>
                {formatDict(dict.appDownloadVersionMismatch, {
                  webVersion: download.webPackageVersion,
                  apkVersion: download.apkVersion ?? "—",
                })}
              </p>
            ) : null}
          </div>
        ) : (
          <p className={ALERT_WARNING}>
            {dict.appDownloadUnavailable}
          </p>
        )}
      </div>
    </section>
  );
}
