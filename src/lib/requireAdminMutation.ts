import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

/** Wyłącznie rola `admin` może mutować dane (nie dotyczy konta `viewer`). */
export async function guardAdminMutation(): Promise<NextResponse | undefined> {
  const session = await getAuthSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return undefined;
}
