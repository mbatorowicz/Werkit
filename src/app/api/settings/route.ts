import { NextResponse } from 'next/server';
import { db } from '@/db';
import { companySettings } from '@/db/schema';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Zawsze trzymamy tylko jeden nadrzędny wiersz ustawień z id = 1
    await db.insert(companySettings)
      .values({ 
         id: 1, 
         companyName: body.companyName, 
         companyAddress: body.companyAddress, 
         baseLatitude: body.baseLatitude, 
         baseLongitude: body.baseLongitude 
      })
      .onConflictDoUpdate({
         target: companySettings.id,
         set: {
           companyName: body.companyName, 
           companyAddress: body.companyAddress, 
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
