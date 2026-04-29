import { NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    
    if(!body.lastName) return NextResponse.json({ error: 'Nazwisko jest wymagane.' }, { status: 400 });

    await db.update(customers).set({ 
       firstName: body.firstName || null,
       lastName: body.lastName,
       defaultAddress: body.defaultAddress || null
    }).where(eq(customers.id, id));
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Błąd aktualizacji' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ error: 'Nieprawidłowy ID' }, { status: 400 });

    await db.delete(customers).where(eq(customers.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete customer error", err);
    return NextResponse.json({ error: 'Nie można usunąć klienta. Może posiadać przypisane zlecenia.' }, { status: 500 });
  }
}
