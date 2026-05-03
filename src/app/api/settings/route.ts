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
         baseLongitude: body.baseLongitude,
         cancelWindowMinutes: body.cancelWindowMinutes ?? 5,
         requirePhotoToFinish: body.requirePhotoToFinish ?? false,
         geofenceRadiusMeters: body.geofenceRadiusMeters ?? 500,
         timeOverrunReminder: body.timeOverrunReminder ?? true
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
           baseLongitude: body.baseLongitude,
           cancelWindowMinutes: body.cancelWindowMinutes ?? 5,
           requirePhotoToFinish: body.requirePhotoToFinish ?? false,
           geofenceRadiusMeters: body.geofenceRadiusMeters ?? 500,
           timeOverrunReminder: body.timeOverrunReminder ?? true
         }
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Settings saving error", err);
    return NextResponse.json({ error: 'System save failed' }, { status: 500 });
  }
}
