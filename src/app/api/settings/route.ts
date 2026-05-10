import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { DictionaryService } = await import('@/services/DictionaryService');
    const data = await DictionaryService.getSettings();
    return NextResponse.json(data[0] || {});
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { DictionaryService } = await import('@/services/DictionaryService');
    
    await DictionaryService.updateSettings({
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
       timeOverrunReminder: body.timeOverrunReminder ?? true,
       upcomingOrderReminderMinutes: body.upcomingOrderReminderMinutes ?? 120
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Settings saving error", err);
    return NextResponse.json({ error: 'System save failed' }, { status: 500 });
  }
}
