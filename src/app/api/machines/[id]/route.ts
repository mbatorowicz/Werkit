import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { isMissingResourcesVehicleColumns } from '@/lib/postgresMigrationHints';
import { buildResourceDisplayName, isVehicleIdentityEmpty } from '@/lib/resourceDisplayName';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }
    const body = await request.json();
    const brand = typeof body.brand === 'string' ? body.brand : '';
    const model = typeof body.model === 'string' ? body.model : '';
    const registrationNumber = typeof body.registrationNumber === 'string' ? body.registrationNumber : '';

    if (!body.categoryIds || !Array.isArray(body.categoryIds)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    if (isVehicleIdentityEmpty(brand, model, registrationNumber)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const name = buildResourceDisplayName(brand, model, registrationNumber);
    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.updateResource(
      id,
      {
        name,
        brand,
        model,
        registrationNumber,
        imageUrl: body.imageUrl === null || typeof body.imageUrl === 'string' ? body.imageUrl : undefined,
      },
      body.categoryIds.map((c: string | number) => parseInt(String(c), 10)),
    );
    
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('PUT /api/machines/[id]:', err);
    if (isMissingResourcesVehicleColumns(err)) {
      return NextResponse.json({ error: 'migration_required' }, { status: 503 });
    }
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
