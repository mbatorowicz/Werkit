import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import { isMissingResourceCategoriesStationaryColumn } from '@/lib/postgresMigrationHints';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { DictionaryService } = await import('@/services/DictionaryService');
    const allCategories = await DictionaryService.getCategories();
    return NextResponse.json(allCategories);
  } catch (err: unknown) {
    console.error('Categories GET:', err);
    if (isMissingResourceCategoriesStationaryColumn(err)) {
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
    const { name, icon, reqCustomer, reqMaterial, reqQuantity, reqTaskDescription, isGlobal, isStationary, color } = body;

    if(!name) {
      return NextResponse.json({ error: 'missing_name' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.addCategory({
      name: name.trim(),
      icon: icon || 'Truck',
      reqCustomer: !!reqCustomer,
      reqMaterial: !!reqMaterial,
      reqQuantity: !!reqQuantity,
      reqTaskDescription: reqTaskDescription !== undefined ? !!reqTaskDescription : true,
      isGlobal: !!isGlobal,
      isStationary: !!isStationary,
      color: color || '#3f3f46',
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'category_exists' }, { status: 500 });
  }
}
