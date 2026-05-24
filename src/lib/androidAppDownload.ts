import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AndroidApkBuildType, AndroidApkMeta } from '@/lib/apkMeta';
import { parseAndroidApkMeta } from '@/lib/apkMeta';
import {
  fetchGithubReleaseApkMeta,
  isGithubReleaseApkAvailable,
  resolveGithubReleaseApkConfig,
} from '@/lib/githubReleaseApk';
import { WEB_PACKAGE_VERSION } from '@/lib/version';

/** Ścieżka względem katalogu projektu (opcjonalny plik na deploy). */
export const LOCAL_ANDROID_APK_RELATIVE = 'public/downloads/werkit.apk';

export const LOCAL_ANDROID_APK_META_RELATIVE = 'public/downloads/werkit-apk-meta.json';

export const ANDROID_APK_DOWNLOAD_ROUTE = '/api/app/android';

export const ANDROID_APK_INFO_ROUTE = '/api/app/android/info';

export function getAndroidApkFileName(apkVersion?: string | null): string {
  const v = apkVersion?.trim() || WEB_PACKAGE_VERSION;
  return `werkit-${v}.apk`;
}

export type AndroidAppDownloadSource = 'remote' | 'local' | 'github' | null;

export type AndroidAppDownloadInfo = {
  available: boolean;
  href: string;
  fileName: string;
  source: AndroidAppDownloadSource;
  webPackageVersion: string;
  apkVersion: string | null;
  buildType: AndroidApkBuildType | null;
  builtAt: string | null;
  commitSha: string | null;
  inSync: boolean;
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

function resolveLocalAndroidApkMetaPath(): string | undefined {
  const absolute = join(process.cwd(), LOCAL_ANDROID_APK_META_RELATIVE);
  return existsSync(absolute) ? absolute : undefined;
}

export function resolveAndroidApkDownloadSource(): AndroidAppDownloadSource {
  if (resolveRemoteAndroidApkUrl()) return 'remote';
  if (resolveLocalAndroidApkPath()) return 'local';
  if (resolveGithubReleaseApkConfig()) return 'github';
  return null;
}

function baseInfo(source: AndroidAppDownloadSource): Omit<AndroidAppDownloadInfo, 'available'> {
  return {
    href: ANDROID_APK_DOWNLOAD_ROUTE,
    fileName: getAndroidApkFileName(),
    source,
    webPackageVersion: WEB_PACKAGE_VERSION,
    apkVersion: null,
    buildType: null,
    builtAt: null,
    commitSha: null,
    inSync: false,
  };
}

function infoFromMeta(
  partial: Omit<AndroidAppDownloadInfo, 'available'>,
  meta: AndroidApkMeta | null,
  fallbackVersion?: string,
): Omit<AndroidAppDownloadInfo, 'available'> {
  const apkVersion = meta?.version ?? fallbackVersion ?? null;
  return {
    ...partial,
    fileName: getAndroidApkFileName(apkVersion),
    apkVersion,
    buildType: meta?.buildType ?? null,
    builtAt: meta?.builtAt ?? null,
    commitSha: meta?.commitSha ?? null,
    inSync: apkVersion !== null && apkVersion === WEB_PACKAGE_VERSION,
  };
}

async function readLocalApkMeta(): Promise<AndroidApkMeta | null> {
  const metaPath = resolveLocalAndroidApkMetaPath();
  if (!metaPath) return null;
  try {
    const text = await readFile(metaPath, 'utf8');
    return parseAndroidApkMeta(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

/** Informacja dla UI (server) — weryfikuje dostępność APK i czyta metadane builda. */
export async function getAndroidAppDownloadInfoAsync(): Promise<AndroidAppDownloadInfo> {
  const remoteUrl = resolveRemoteAndroidApkUrl();
  if (remoteUrl) {
    return {
      ...infoFromMeta(baseInfo('remote'), null, WEB_PACKAGE_VERSION),
      available: true,
      inSync: true,
    };
  }

  const localPath = resolveLocalAndroidApkPath();
  if (localPath) {
    const meta = await readLocalApkMeta();
    const stat = statSync(localPath);
    const mergedMeta: AndroidApkMeta | null =
      meta ??
      ({
        version: WEB_PACKAGE_VERSION,
        packageVersion: WEB_PACKAGE_VERSION,
        buildType: 'debug',
        builtAt: stat.mtime.toISOString(),
      } satisfies AndroidApkMeta);
    return {
      ...infoFromMeta(baseInfo('local'), mergedMeta, WEB_PACKAGE_VERSION),
      available: true,
    };
  }

  const github = resolveGithubReleaseApkConfig();
  if (github) {
    const [available, meta] = await Promise.all([
      isGithubReleaseApkAvailable(github),
      fetchGithubReleaseApkMeta(github),
    ]);
    return {
      ...infoFromMeta(baseInfo('github'), meta),
      available,
    };
  }

  return {
    ...baseInfo(null),
    available: false,
  };
}
