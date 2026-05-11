import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import {
  isMissingResourcesVehicleColumns,
} from '@/lib/postgresMigrationHints';
import { buildResourceDisplayName, isVehicleIdentityEmpty } from '@/lib/resourceDisplayName';

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
    const { categoryIds, imageUrl } = body;

    if (!categoryIds || !Array.isArray(categoryIds)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }
    if (isVehicleIdentityEmpty(brand, model, registrationNumber)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const name = buildResourceDisplayName(brand, model, registrationNumber);
    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.addResource(
      { name, brand, model, registrationNumber },
      categoryIds.map((c: string | number) => parseInt(String(c), 10)),
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
