import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { DEVICE_LOGS_EXPORT_MAX } from '@/lib/deviceLogLimits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin' && session.role !== 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { SystemLogService } = await import('@/services/SystemLogService');
    const rows = await SystemLogService.getRecentLogs(DEVICE_LOGS_EXPORT_MAX);
    const body = JSON.stringify(rows);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `werkit-device-logs-${stamp}.json`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'export_failed' }, { status: 500 });
  }
}
