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
    const updateData: any = { name: body.name.trim(), icon: body.icon || 'Truck' };
    if (body.reqCustomer !== undefined) updateData.reqCustomer = !!body.reqCustomer;
    if (body.reqMaterial !== undefined) updateData.reqMaterial = !!body.reqMaterial;
    if (body.reqQuantity !== undefined) updateData.reqQuantity = !!body.reqQuantity;
    if (body.reqTaskDescription !== undefined) updateData.reqTaskDescription = !!body.reqTaskDescription;
    if (body.isGlobal !== undefined) updateData.isGlobal = !!body.isGlobal;
    
    await DictionaryService.updateCategory(id, updateData);
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
