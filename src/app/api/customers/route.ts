import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { DictionaryService } = await import('@/services/DictionaryService');
    const allCustomers = await DictionaryService.getCustomers();
    return NextResponse.json(allCustomers);
  } catch {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { firstName, lastName, defaultAddress, latitude, longitude } = body;

    if(!lastName) {
      return NextResponse.json({ error: 'missing_name' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.addCustomer(
      firstName || null, 
      lastName, 
      defaultAddress || null,
      latitude ? latitude.toString() : null,
      longitude ? longitude.toString() : null
    );
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
