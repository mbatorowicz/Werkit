import { NextResponse } from 'next/server';
import { db } from '@/db';
import { customers } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const allCustomers = await db.select().from(customers).orderBy(desc(customers.id));
    return NextResponse.json(allCustomers);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, defaultAddress } = body;

    if(!lastName) {
      return NextResponse.json({ error: 'Nazwisko / Nazwa firmy jest wymagana.' }, { status: 400 });
    }

    await db.insert(customers).values({ 
      firstName: firstName || null, 
      lastName, 
      defaultAddress: defaultAddress || null 
    });
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Błąd dodawania klienta do bazy.' }, { status: 500 });
  }
}
