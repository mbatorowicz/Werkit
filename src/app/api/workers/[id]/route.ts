import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ error: 'Nieprawidłowy ID' }, { status: 400 });

    // Nieodwracalne usunięcie pracownika zgodnie z zaleceniami
    await db.delete(users).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete user error", err);
    return NextResponse.json({ error: 'Błąd podczas usuwania. Prawdopodobnie jego poprzednie jazdy blokują kaskadę usunięcia.' }, { status: 500 });
  }
}
