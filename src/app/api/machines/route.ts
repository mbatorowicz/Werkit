import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources, resourceCategories } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { DictionaryService } = await import('@/services/DictionaryService');
    const allMachines = await DictionaryService.getResources();
    return NextResponse.json(allMachines);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)), stack: (err instanceof Error ? err.stack : undefined) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, categoryIds } = body;

    if(!name || !categoryIds || !Array.isArray(categoryIds)) {
      return NextResponse.json({ error: 'missing_fields' }, { status: 400 });
    }

    const { DictionaryService } = await import('@/services/DictionaryService');
    await DictionaryService.addResource(name, categoryIds.map((c: string | number) => parseInt(c as string)));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Machine register error", err);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
