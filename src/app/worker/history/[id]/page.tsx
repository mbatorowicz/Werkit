import { ArrowLeft, Clock, MapPin, Camera, FileText } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { workSessions, gpsLogs, sessionNotes, sessionPhotos, materials, customers } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { JWT_SECRET } from '@/lib/auth';
import { notFound } from "next/navigation";
import MapWrapper from "./MapWrapper";

async function getUserId() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.userId as number;
  } catch {
    return null;
  }
}

export const dynamicConfig = 'force-dynamic';

export default async function HistoryDetailPage({ params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return <div>Brak dostępu</div>;

  const sessionId = parseInt(params.id);
  if (isNaN(sessionId)) notFound();

  const [sessionData] = await db.select({
    id: workSessions.id,
    sessionType: workSessions.sessionType,
    startTime: workSessions.startTime,
    endTime: workSessions.endTime,
    taskDescription: workSessions.taskDescription,
    quantityTons: workSessions.quantityTons,
    materialName: materials.name,
    customerFirstName: customers.firstName,
    customerLastName: customers.lastName,
    customerAddress: customers.address,
    customerLat: customers.latitude,
    customerLng: customers.longitude,
  })
  .from(workSessions)
  .leftJoin(materials, eq(workSessions.materialId, materials.id))
  .leftJoin(customers, eq(workSessions.customerId, customers.id))
  .where(and(eq(workSessions.id, sessionId), eq(workSessions.userId, userId)));

  if (!sessionData) {
    notFound();
  }

  const logs = await db.select().from(gpsLogs).where(eq(gpsLogs.sessionId, sessionId)).orderBy(gpsLogs.timestamp);
  const pathTraveled = logs.map(l => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) }));
  
  const notes = await db.select().from(sessionNotes).where(eq(sessionNotes.sessionId, sessionId));
  const photos = await db.select().from(sessionPhotos).where(eq(sessionPhotos.sessionId, sessionId));

  const events: any[] = [];
  notes.forEach(n => {
    if (n.latitude && n.longitude) {
      events.push({ id: `note_${n.id}`, lat: parseFloat(n.latitude), lng: parseFloat(n.longitude), type: 'note', label: 'Notatka', note: n.note, createdAt: n.createdAt });
    }
  });
  photos.forEach(p => {
    if (p.latitude && p.longitude) {
      events.push({ id: `photo_${p.id}`, lat: parseFloat(p.latitude), lng: parseFloat(p.longitude), type: 'photo', label: 'Zdjęcie', photoUrl: p.photoUrl, createdAt: p.createdAt });
    }
  });
  events.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const currentLocation = pathTraveled.length > 0 ? pathTraveled[pathTraveled.length - 1] : { lat: 52.2297, lng: 21.0122 };

  let destination = null;
  if (sessionData.customerLat && sessionData.customerLng) {
    destination = { lat: parseFloat(sessionData.customerLat), lng: parseFloat(sessionData.customerLng) };
  }

  return (
    <div className="py-6 pb-20">
      <Link href="/worker/history" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-semibold">Wróć do historii</span>
      </Link>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-5 mb-6 shadow-sm">
        <div className="font-semibold text-xl text-zinc-900 dark:text-white mb-2">
           {sessionData.sessionType === 'TRANSPORT' ? 'Transport Kruszyw' : sessionData.sessionType === 'MACHINE_OP' ? 'Praca Sprzętem' : 'Warsztat'}
        </div>
        <div className="flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
           <p className="flex items-center gap-2">
             <Clock className="w-4 h-4 text-zinc-400" />
             <span>{sessionData.startTime.toLocaleString('pl-PL')} - {sessionData.endTime?.toLocaleString('pl-PL')}</span>
           </p>
           {sessionData.sessionType === 'TRANSPORT' ? (
             <p className="flex items-center gap-2">
               <MapPin className="w-4 h-4 text-zinc-400" />
               <span>Cel: {sessionData.customerFirstName} {sessionData.customerLastName} ({sessionData.customerAddress || 'Brak adresu'})</span>
             </p>
           ) : (
             <p className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded text-zinc-700 dark:text-zinc-300">
               {sessionData.taskDescription || 'Brak szczegółowego opisu zadań.'}
             </p>
           )}
        </div>
      </div>

      <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3">Zapisana Trasa i Zdarzenia</h3>
      <div className="w-full h-64 md:h-96 relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-inner bg-zinc-100 dark:bg-zinc-900 mb-6">
        {pathTraveled.length > 0 ? (
          <MapWrapper 
            currentLocation={currentLocation} 
            pathTraveled={pathTraveled} 
            destination={destination}
            events={events}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center flex-col gap-2 text-zinc-500">
            <MapPin className="w-8 h-8 opacity-50" />
            <span className="text-sm">Brak zapisanych danych GPS dla tego zlecenia.</span>
          </div>
        )}
      </div>

      {(notes.length > 0 || photos.length > 0) && (
        <>
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-8">Oś Czasu (Notatki i Zdjęcia)</h3>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 flex flex-col gap-4 shadow-sm">
            {events.map((item, index) => (
              <div key={item.id} className="flex gap-3 relative">
                {index < events.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-zinc-200 dark:bg-zinc-700"></div>
                )}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${item.type === 'photo' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                  {item.type === 'photo' ? <Camera className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="text-[10px] text-zinc-400 mb-1">{new Date(item.createdAt).toLocaleString('pl-PL')}</div>
                  {item.type === 'photo' ? (
                    <div className="w-24 h-24 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 mt-1">
                      <img src={item.photoUrl} alt="Zdarzenie" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 break-words bg-zinc-50 dark:bg-zinc-800 p-2 rounded mt-1">{item.note}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
