import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resourceCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.updateCategory(id, { name: body.name.trim(), icon: body.icon || 'Truck' });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'category_in_use' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'category_has_machines' }, { status: 500 });
  }
}
