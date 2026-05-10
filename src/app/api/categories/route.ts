import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resourceCategories } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { DictionaryService } = await import('@/services/DictionaryService');
    const allCategories = await DictionaryService.getCategories();
    return NextResponse.json(allCategories);
  } catch (err: unknown) {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, icon, reqCustomer, reqMaterial, reqQuantity, reqTaskDescription, isGlobal } = body;

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
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: 'category_exists' }, { status: 500 });
  }
}
