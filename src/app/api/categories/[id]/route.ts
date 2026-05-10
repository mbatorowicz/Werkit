import { NextResponse } from 'next/server';
import type { resourceCategories } from '@/db/schema';

type CategoryUpdate = Partial<typeof resourceCategories.$inferInsert>;

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'missing_name' }, { status: 400 });

    const { DictionaryService } = await import('@/services/DictionaryService');
    const updateData: CategoryUpdate = { name: body.name.trim(), icon: body.icon || 'Truck' };
    if (body.reqCustomer !== undefined) updateData.reqCustomer = !!body.reqCustomer;
    if (body.reqMaterial !== undefined) updateData.reqMaterial = !!body.reqMaterial;
    if (body.reqQuantity !== undefined) updateData.reqQuantity = !!body.reqQuantity;
    if (body.reqTaskDescription !== undefined) updateData.reqTaskDescription = !!body.reqTaskDescription;
    if (body.isGlobal !== undefined) updateData.isGlobal = !!body.isGlobal;
    if (body.color !== undefined) updateData.color = body.color;
    
    await DictionaryService.updateCategory(id, updateData);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Category update error:', err);
    return NextResponse.json({ error: 'category_in_use' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Category delete error:', err);
    return NextResponse.json({ error: 'category_has_machines' }, { status: 500 });
  }
}
