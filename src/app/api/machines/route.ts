import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources, resourceCategories } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allMachines = await db.select({
      id: resources.id,
      name: resources.name,
      categoryId: resources.categoryId,
      categoryName: resourceCategories.name
    })
    .from(resources)
    .leftJoin(resourceCategories, eq(resources.categoryId, resourceCategories.id))
    .orderBy(desc(resources.id));
    
    return NextResponse.json(allMachines);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, categoryId } = body;

    if(!name || !categoryId) {
      return NextResponse.json({ error: 'Wypełnij nazwę oraz wybraną kategorię.' }, { status: 400 });
    }

    await db.insert(resources).values({
      name,
      categoryId: parseInt(categoryId),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Machine register error", err);
    return NextResponse.json({ error: 'Wystąpił błąd podczas zapisywania maszyny do bazy.' }, { status: 500 });
  }
}
