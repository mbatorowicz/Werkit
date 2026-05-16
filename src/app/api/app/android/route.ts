import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { jsonError } from '@/lib/apiRoute';
import {
  getAndroidApkFileName,
  resolveLocalAndroidApkPath,
  resolveRemoteAndroidApkUrl,
} from '@/lib/androidAppDownload';
import { isSuperadminRole } from '@/lib/tenantContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DOWNLOAD_ROLES = new Set(['admin', 'viewer', 'worker']);

/** Pobranie APK — nagłówki pod instalację na Androidzie (Chrome / WebView). */
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
  if (!localPath) {
    return jsonError('apk_unavailable', 404);
  }

  const bytes = await readFile(localPath);
  const fileName = getAndroidApkFileName();

  return new NextResponse(bytes, {
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
