import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { DictionaryService } = await import('@/services/DictionaryService');
    const allMaterials = await DictionaryService.getMaterials();
    return NextResponse.json(allMaterials);
  } catch (err: unknown) {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.addMaterial(name, type);
    
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Material Insert Error:', err);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
