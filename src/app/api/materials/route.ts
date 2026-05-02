import { NextResponse } from 'next/server';
import { db } from '@/db';
import { materials } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function GET() {
  try {
    const allMaterials = await db.select().from(materials).orderBy(desc(materials.id));
    return NextResponse.json(allMaterials);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type } = body;

    if(!name || !type) {
      return NextResponse.json({ error: 'Nazwa oraz typ kruszywa są wymagane.' }, { status: 400 });
    }

    await db.insert(materials).values({ name, type });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Material Insert Error:', err);
    return NextResponse.json({ error: 'Błąd dodawania kruszywa: ' + err.message }, { status: 500 });
  }
}
