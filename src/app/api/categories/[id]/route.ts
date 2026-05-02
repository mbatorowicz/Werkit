import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resourceCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();

    await db.update(resourceCategories).set({ name: body.name.trim(), icon: body.icon || 'Truck' }).where(eq(resourceCategories.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'category_in_use' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    await db.delete(resourceCategories).where(eq(resourceCategories.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'category_has_machines' }, { status: 500 });
  }
}
