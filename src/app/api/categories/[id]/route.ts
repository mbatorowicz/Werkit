import { NextResponse } from 'next/server';
import type { ResourceCategoryUpdateInput } from '@/services/DictionaryService';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import {
  isMissingResourceCategoriesStationaryColumn,
  isMissingResourceCategoriesVisibilityColumns,
} from '@/lib/postgresMigrationHints';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'missing_name' }, { status: 400 });

    const { DictionaryService } = await import('@/services/DictionaryService');
    const updateData: ResourceCategoryUpdateInput = { name: body.name.trim(), icon: body.icon || 'Truck' };
    if (body.showCustomer !== undefined) updateData.showCustomer = !!body.showCustomer;
    if (body.showMaterial !== undefined) updateData.showMaterial = !!body.showMaterial;
    if (body.showQuantity !== undefined) updateData.showQuantity = !!body.showQuantity;
    if (body.showTaskDescription !== undefined) updateData.showTaskDescription = !!body.showTaskDescription;
    if (body.reqCustomer !== undefined) updateData.reqCustomer = !!body.reqCustomer;
    if (body.reqMaterial !== undefined) updateData.reqMaterial = !!body.reqMaterial;
    if (body.reqQuantity !== undefined) updateData.reqQuantity = !!body.reqQuantity;
    if (body.reqTaskDescription !== undefined) updateData.reqTaskDescription = !!body.reqTaskDescription;
    if (body.isGlobal !== undefined) updateData.isGlobal = !!body.isGlobal;
    if (body.isStationary !== undefined) updateData.isStationary = !!body.isStationary;
    if (body.color !== undefined) updateData.color = body.color;

    // Jeśli pole jest wymagane, musi być też widoczne.
    if (updateData.reqCustomer) updateData.showCustomer = true;
    if (updateData.reqMaterial) updateData.showMaterial = true;
    if (updateData.reqQuantity) updateData.showQuantity = true;
    if (updateData.reqTaskDescription) updateData.showTaskDescription = true;
    
    await DictionaryService.updateCategory(id, updateData);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Category update error:', err);
    if (
      isMissingResourceCategoriesStationaryColumn(err) ||
      isMissingResourceCategoriesVisibilityColumns(err)
    ) {
      return NextResponse.json({ error: 'migration_required' }, { status: 503 });
    }
    return NextResponse.json({ error: 'category_in_use' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

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
