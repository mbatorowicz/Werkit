import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';
import {
  isMissingResourceCategoriesStationaryColumn,
  isMissingResourceCategoriesVisibilityColumns,
} from '@/lib/postgresMigrationHints';

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
    const {
      name,
      icon,
      showCustomer,
      showMaterial,
      showQuantity,
      showTaskDescription,
      reqCustomer,
      reqMaterial,
      reqQuantity,
      reqTaskDescription,
      isGlobal,
      isStationary,
      color,
    } = body;

    if(!name) {
      return NextResponse.json({ error: 'missing_name' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    const sc = showCustomer !== undefined ? !!showCustomer : true;
    const sm = showMaterial !== undefined ? !!showMaterial : true;
    const sq = showQuantity !== undefined ? !!showQuantity : true;
    const std = showTaskDescription !== undefined ? !!showTaskDescription : true;
    const rc = !!reqCustomer;
    const rm = !!reqMaterial;
    const rq = !!reqQuantity;
    const rtd = reqTaskDescription !== undefined ? !!reqTaskDescription : true;
    await DictionaryService.addCategory({
      name: name.trim(),
      icon: icon || 'Truck',
      showCustomer: sc || rc,
      showMaterial: sm || rm,
      showQuantity: sq || rq,
      showTaskDescription: std || rtd,
      reqCustomer: rc,
      reqMaterial: rm,
      reqQuantity: rq,
      reqTaskDescription: rtd,
      isGlobal: !!isGlobal,
      isStationary: !!isStationary,
      color: color || '#3f3f46',
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Categories POST:', err);
    if (
      isMissingResourceCategoriesVisibilityColumns(err) ||
      isMissingResourceCategoriesStationaryColumn(err)
    ) {
      return NextResponse.json({ error: 'migration_required' }, { status: 503 });
    }
    return NextResponse.json({ error: 'category_exists' }, { status: 500 });
  }
}
