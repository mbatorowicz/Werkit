import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    
    if(!body.name || !body.categoryId) return NextResponse.json({ error: 'Uzupełnij pola' }, { status: 400 });

    await db.update(resources).set({ 
       name: body.name, 
       categoryId: parseInt(body.categoryId) 
    }).where(eq(resources.id, id));
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Błąd aktualizacji' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ error: 'Nieprawidłowy ID Maszyny' }, { status: 400 });

    await db.delete(resources).where(eq(resources.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete machine error", err);
    return NextResponse.json({ error: 'Błąd usunięcia - upewnij się, że nie powiązano archiwum.' }, { status: 500 });
  }
}
