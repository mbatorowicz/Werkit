import { NextResponse } from 'next/server';
import type { MaterialCategoryUpdateInput } from '@/services/DictionaryService';
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const updateData: MaterialCategoryUpdateInput = {};
    if (typeof body.name === 'string') updateData.name = body.name.trim();
    if (typeof body.color === 'string') updateData.color = body.color;
    if (!updateData.name && !updateData.color) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.updateMaterialCategory(id, updateData);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.deleteMaterialCategory(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'material_in_use' }, { status: 500 });
  }
}
