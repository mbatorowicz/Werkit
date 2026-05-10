import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await context.params;
    const id = parseInt(params.id);
    const body = await request.json();
    
    if(!body.name || !body.categoryIds || !Array.isArray(body.categoryIds)) return NextResponse.json({ error: 'missing_fields' }, { status: 400 });

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.updateResource(id, { 
       name: body.name,
       imageUrl: body.imageUrl
    }, body.categoryIds.map((c: string | number) => parseInt(c as string)));
    
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
    await DictionaryService.deleteResource(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete machine error", err);
    return NextResponse.json({ error: 'machine_in_use' }, { status: 500 });
  }
}
