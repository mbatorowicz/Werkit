import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resources } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const allMachines = await db.select().from(resources).orderBy(desc(resources.id));
    return NextResponse.json(allMachines);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type } = body;

    if(!name || !type) {
      return NextResponse.json({ error: 'Wypełnij wszystkie pola nazwy oraz kategorii.' }, { status: 400 });
    }

    await db.insert(resources).values({
      name,
      type,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Machine register error", err);
    return NextResponse.json({ error: 'Wystąpił nieznany błąd podczas zapisywania maszyny do bazy.' }, { status: 500 });
  }
}
