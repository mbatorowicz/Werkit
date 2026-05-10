import { NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    
    if(!body.lastName) return NextResponse.json({ error: 'missing_name' }, { status: 400 });

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.updateCustomer(id, { 
       firstName: body.firstName || null,
       lastName: body.lastName,
       defaultAddress: body.defaultAddress || null,
       latitude: body.latitude ? body.latitude.toString() : null,
       longitude: body.longitude ? body.longitude.toString() : null
    });
    
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ error: 'fetch_error' }, { status: 400 });

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.deleteCustomer(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete customer error", err);
    return NextResponse.json({ error: 'customer_in_use' }, { status: 500 });
  }
}
