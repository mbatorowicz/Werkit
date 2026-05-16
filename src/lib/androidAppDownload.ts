import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pkg from '../../package.json';

/** Ścieżka względem katalogu projektu (opcjonalny plik na deploy). */
export const LOCAL_ANDROID_APK_RELATIVE = 'public/downloads/werkit.apk';

export const ANDROID_APK_DOWNLOAD_ROUTE = '/api/app/android';

export function getAndroidApkFileName(): string {
  return `werkit-${pkg.version}.apk`;
}

export type AndroidAppDownloadInfo = {
  available: boolean;
  href: string;
  fileName: string;
  source: 'remote' | 'local' | null;
};

function trimEnv(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v && v.length > 0 ? v : undefined;
}

export function resolveRemoteAndroidApkUrl(): string | undefined {
  return trimEnv(process.env.WERKIT_ANDROID_APK_URL);
}

export function resolveLocalAndroidApkPath(): string | undefined {
  const absolute = join(process.cwd(), LOCAL_ANDROID_APK_RELATIVE);
  return existsSync(absolute) ? absolute : undefined;
}

/** Informacja dla UI (server). */
export function getAndroidAppDownloadInfo(): AndroidAppDownloadInfo {
  const remote = resolveRemoteAndroidApkUrl();
  const local = resolveLocalAndroidApkPath();
  const fileName = getAndroidApkFileName();
  const href = ANDROID_APK_DOWNLOAD_ROUTE;

  if (remote) {
    return { available: true, href, fileName, source: 'remote' };
  }
  if (local) {
    return { available: true, href, fileName, source: 'local' };
  }
  return { available: false, href, fileName, source: null };
}
