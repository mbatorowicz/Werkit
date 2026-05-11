import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    
    if (!body.name) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

    const categoryIds: number[] | undefined = Array.isArray(body.categoryIds)
      ? body.categoryIds.map((c: string | number) => parseInt(String(c), 10)).filter((n: number) => !Number.isNaN(n))
      : undefined;

    if (categoryIds !== undefined && categoryIds.length === 0) {
      return NextResponse.json({ error: 'missing_material_category' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.updateMaterial(id, { name: body.name }, categoryIds);
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    if (!id) return NextResponse.json({ error: 'fetch_error' }, { status: 400 });

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.deleteMaterial(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete material error", err);
    return NextResponse.json({ error: 'material_in_use' }, { status: 500 });
  }
}
