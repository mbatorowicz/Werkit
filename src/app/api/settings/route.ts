import { NextResponse } from 'next/server';
import { db } from '@/db';
import { companySettings } from '@/db/schema';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    await db.insert(companySettings)
      .values({ 
         id: 1, 
         companyName: body.companyName || 'Werkit ERP', 
         companyAddress: body.companyAddress || '', 
         zipCode: body.zipCode || '', 
         city: body.city || '', 
         phone: body.phone || '', 
         email: body.email || '', 
         baseLatitude: body.baseLatitude, 
         baseLongitude: body.baseLongitude 
      })
      .onConflictDoUpdate({
         target: companySettings.id,
         set: {
           companyName: body.companyName || 'Werkit ERP', 
           companyAddress: body.companyAddress || '', 
           zipCode: body.zipCode || '', 
           city: body.city || '', 
           phone: body.phone || '', 
           email: body.email || '', 
           baseLatitude: body.baseLatitude, 
           baseLongitude: body.baseLongitude 
         }
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Settings saving error", err);
    return NextResponse.json({ error: 'System save failed' }, { status: 500 });
  }
}
