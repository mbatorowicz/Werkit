import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resourceCategories } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allCategories = await db.select().from(resourceCategories).orderBy(desc(resourceCategories.id));
    return NextResponse.json(allCategories);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if(!name) {
      return NextResponse.json({ error: 'Nazwa kategorii jest wymagana.' }, { status: 400 });
    }

    await db.insert(resourceCategories).values({ name: name.trim() });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Kategoria o tej nazwie prawdopodobnie już istnieje.' }, { status: 500 });
  }
}
