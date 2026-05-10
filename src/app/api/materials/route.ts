import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { DictionaryService } = await import('@/services/DictionaryService');
    const allMaterials = await DictionaryService.getMaterials();
    return NextResponse.json(allMaterials);
  } catch {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { name, type } = body;
    const categoryIds: number[] = Array.isArray(body.categoryIds)
      ? body.categoryIds.map((c: string | number) => parseInt(String(c), 10)).filter((n: number) => !Number.isNaN(n))
      : [];

    if (!name || !type) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.addMaterial(name, type, categoryIds);
    
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Material Insert Error:', err);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
