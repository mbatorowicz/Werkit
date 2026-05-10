import { NextResponse } from 'next/server';
import { guardAdminMutation } from '@/lib/requireAdminMutation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { DictionaryService } = await import('@/services/DictionaryService');
    const rows = await DictionaryService.getMaterialCategories();
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardAdminMutation();
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'missing_name' }, { status: 400 });
    }
    const color = typeof body.color === 'string' ? body.color : '#3f3f46';
    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.addMaterialCategory({ name, color });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
