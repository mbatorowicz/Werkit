import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pkg from '../../package.json';
import { resolveGithubReleaseApkConfig } from '@/lib/githubReleaseApk';

/** Ścieżka względem katalogu projektu (opcjonalny plik na deploy). */
export const LOCAL_ANDROID_APK_RELATIVE = 'public/downloads/werkit.apk';

export const ANDROID_APK_DOWNLOAD_ROUTE = '/api/app/android';

export function getAndroidApkFileName(): string {
  return `werkit-${pkg.version}.apk`;
}

export type AndroidAppDownloadSource = 'remote' | 'local' | 'github' | null;

export type AndroidAppDownloadInfo = {
  available: boolean;
  href: string;
  fileName: string;
  source: AndroidAppDownloadSource;
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

export function resolveAndroidApkDownloadSource(): AndroidAppDownloadSource {
  if (resolveRemoteAndroidApkUrl()) return 'remote';
  if (resolveLocalAndroidApkPath()) return 'local';
  if (resolveGithubReleaseApkConfig()) return 'github';
  return null;
}

/** Informacja dla UI (server). Jeden build APK — wspólny dla wszystkich organizacji. */
export function getAndroidAppDownloadInfo(): AndroidAppDownloadInfo {
  const source = resolveAndroidApkDownloadSource();
  return {
    available: source !== null,
    href: ANDROID_APK_DOWNLOAD_ROUTE,
    fileName: getAndroidApkFileName(),
    source,
  };
}
