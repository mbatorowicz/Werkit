import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';
import { WorkerOrderService } from '@/services/WorkerOrderService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const orders = await WorkerOrderService.getPendingOrders(userId);

    return NextResponse.json(orders);
  } catch (err: unknown) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}
