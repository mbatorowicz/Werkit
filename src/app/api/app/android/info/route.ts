import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { jsonError } from '@/lib/apiRoute';
import { getAndroidAppDownloadInfoAsync } from '@/lib/androidAppDownload';
import { isSuperadminRole } from '@/lib/tenantContext';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INFO_ROLES = new Set(['admin', 'viewer', 'worker']);

/** Metadane dostępnego APK (wersja, sync z web, build debug/release). */
export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return jsonError('Unauthorized', 401);
  }
  if (isSuperadminRole(session.role) || !INFO_ROLES.has(session.role)) {
    return jsonError('Forbidden', 403);
  }

  const info = await getAndroidAppDownloadInfoAsync();
  return NextResponse.json(info);
}
