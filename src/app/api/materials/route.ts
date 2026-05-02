import { NextResponse } from 'next/server';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allMaterials = await db.select().from(materials).orderBy(desc(materials.id));
    return NextResponse.json(allMaterials);
  } catch (err: any) {
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

    await db.insert(materials).values({ name, type });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Material Insert Error:', err);
    return NextResponse.json({ error: 'save_error' }, { status: 500 });
  }
}
