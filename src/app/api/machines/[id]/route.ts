import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { isMissingResourcesVehicleColumns } from '@/lib/postgresMigrationHints';
import { buildResourceCanonicalName } from '@/lib/resourceDisplayName';

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
    const description = typeof body.description === 'string' ? body.description : '';

    if (!body.categoryIds || !Array.isArray(body.categoryIds)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    const parsedCatIds = body.categoryIds
      .map((c: string | number) => parseInt(String(c), 10))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    if (parsedCatIds.length === 0) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    const { DictionaryService } = await import('@/services/DictionaryService');
    const vis = await DictionaryService.mergeResourceFormVisibility(parsedCatIds);
    const name = buildResourceCanonicalName(
      vis.showResourceName ? brand : '',
      vis.showResourceName ? model : '',
      vis.showRegistrationNumber ? registrationNumber : '',
      vis.showResourceDescription ? description : null,
    );
    if (!name.trim()) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    await DictionaryService.updateResource(
      id,
      {
        name,
        brand: vis.showResourceName ? brand : '',
        model: vis.showResourceName ? model : '',
        registrationNumber: vis.showRegistrationNumber ? registrationNumber : '',
        description: vis.showResourceDescription ? description : null,
        imageUrl: body.imageUrl === null || typeof body.imageUrl === 'string' ? body.imageUrl : undefined,
      },
      parsedCatIds,
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
    const id = parseInt(params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.deleteResource(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete machine error", err);
    return NextResponse.json({ error: 'machine_in_use' }, { status: 500 });
  }
}
