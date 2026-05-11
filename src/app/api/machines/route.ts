import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import {
  isMissingResourcesVehicleColumns,
} from '@/lib/postgresMigrationHints';
import { buildResourceCanonicalName } from '@/lib/resourceDisplayName';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { DictionaryService } = await import('@/services/DictionaryService');
    const allMachines = await DictionaryService.getResources();
    return NextResponse.json(allMachines);
  } catch (err: unknown) {
    console.error('GET /api/machines:', err);
    if (isMissingResourcesVehicleColumns(err)) {
      return NextResponse.json({ error: 'migration_required' }, { status: 503 });
    }
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const body = await request.json();
    const brand = typeof body.brand === 'string' ? body.brand : '';
    const model = typeof body.model === 'string' ? body.model : '';
    const registrationNumber = typeof body.registrationNumber === 'string' ? body.registrationNumber : '';
    const description = typeof body.description === 'string' ? body.description : '';
    const { categoryIds, imageUrl } = body;

    if (!categoryIds || !Array.isArray(categoryIds)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    const parsedCatIds = categoryIds
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

    await DictionaryService.addResource(
      {
        name,
        brand: vis.showResourceName ? brand : '',
        model: vis.showResourceName ? model : '',
        registrationNumber: vis.showRegistrationNumber ? registrationNumber : '',
        description: vis.showResourceDescription ? description : null,
      },
      parsedCatIds,
      typeof imageUrl === 'string' || imageUrl === null ? imageUrl : undefined,
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Machine register error", err);
    if (isMissingResourcesVehicleColumns(err)) {
      return NextResponse.json({ error: 'migration_required' }, { status: 503 });
    }
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
