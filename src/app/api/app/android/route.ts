import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { jsonError } from '@/lib/apiRoute';
import {
  getAndroidApkFileName,
  resolveLocalAndroidApkPath,
  resolveRemoteAndroidApkUrl,
} from '@/lib/androidAppDownload';
import {
  fetchGithubReleaseApkBytes,
  resolveGithubReleaseApkConfig,
} from '@/lib/githubReleaseApk';
import { isSuperadminRole } from '@/lib/tenantContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOWNLOAD_ROLES = new Set(['admin', 'viewer', 'worker']);

function apkResponse(bytes: Uint8Array, fileName: string): NextResponse {
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/** Pobranie APK — jeden build z GitHub Actions, wspólny dla wszystkich firm. */
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return jsonError('Unauthorized', 401);
  }
  if (isSuperadminRole(session.role) || !DOWNLOAD_ROLES.has(session.role)) {
    return jsonError('Forbidden', 403);
  }

  const remoteUrl = resolveRemoteAndroidApkUrl();
  if (remoteUrl) {
    return NextResponse.redirect(remoteUrl, 302);
  }

  const localPath = resolveLocalAndroidApkPath();
  if (localPath) {
    const bytes = await readFile(localPath);
    return apkResponse(new Uint8Array(bytes), getAndroidApkFileName());
  }

  const github = resolveGithubReleaseApkConfig();
  if (github) {
    try {
      const { bytes } = await fetchGithubReleaseApkBytes(github);
      return apkResponse(bytes, getAndroidApkFileName());
    } catch {
      return jsonError('apk_unavailable', 404);
    }
  }

  return jsonError('apk_unavailable', 404);
}
