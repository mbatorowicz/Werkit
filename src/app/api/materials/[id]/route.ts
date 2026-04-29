import { NextResponse } from 'next/server';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    
    if(!body.name || !body.type) return NextResponse.json({ error: 'Uzupełnij pola.' }, { status: 400 });

    await db.update(materials).set({ 
       name: body.name,
       type: body.type
    }).where(eq(materials.id, id));
    
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

    await db.delete(materials).where(eq(materials.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete material error", err);
    return NextResponse.json({ error: 'Nie można usunąć materiału. Może być przypisany do zleceń.' }, { status: 500 });
  }
}
