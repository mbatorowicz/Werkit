import { NextResponse } from 'next/server';
import { db } from '@/db';
import { resourceCategories } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allCategories = await db.select().from(resourceCategories).orderBy(desc(resourceCategories.id));
    return NextResponse.json(allCategories);
  } catch (err: any) {
    return NextResponse.json({ error: 'fetch_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, icon } = body;

    if(!name) {
      return NextResponse.json({ error: 'missing_name' }, { status: 400 });
    }

    await db.insert(resourceCategories).values({ name: name.trim(), icon: icon || 'Truck' });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'category_exists' }, { status: 500 });
  }
}
