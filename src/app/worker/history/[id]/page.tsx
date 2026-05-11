import { ArrowLeft, MapPin, Camera, FileText } from "lucide-react";
import Link from "next/link";
import { TimelineItem } from "@/types/worker";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { JWT_SECRET } from '@/lib/auth';
import { notFound } from "next/navigation";
import MapWrapper from "./MapWrapper";
import Image from "next/image";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";

function asDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

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

export const dynamic = 'force-dynamic';

export default async function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return <div>Brak dostępu</div>;

  const resolvedParams = await params;
  const sessionId = parseInt(resolvedParams.id);
  if (isNaN(sessionId)) notFound();

  const { WorkerSessionService } = await import('@/services/WorkerSessionService');
  const historyData = await WorkerSessionService.getSessionHistoryFull(sessionId, userId);

  if (!historyData) {
    notFound();
  }

  const { sessionData, logs, notes, photos } = historyData;

  const pathTraveled = logs
    .filter((l) => Boolean(l.latitude && l.longitude))
    .map((l) => ({ lat: parseFloat(l.latitude), lng: parseFloat(l.longitude) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  const isStationary = Boolean((sessionData as { categoryIsStationary?: boolean | null }).categoryIsStationary);

  // Oś czasu pokazujemy zawsze (nawet jeśli brak koordynatów). Mapę karmimy tylko zdarzeniami z lat/lng.
  const timelineEvents: TimelineItem[] = [
    ...notes.map((n) => ({
      id: `note_${n.id}`,
      lat: n.latitude ? parseFloat(String(n.latitude)) : 0,
      lng: n.longitude ? parseFloat(String(n.longitude)) : 0,
      type: "note" as const,
      content: n.note,
      createdAt: asDate(n.createdAt)?.toISOString() ?? new Date(0).toISOString(),
    })),
    ...photos.map((p) => ({
      id: `photo_${p.id}`,
      lat: p.latitude ? parseFloat(String(p.latitude)) : 0,
      lng: p.longitude ? parseFloat(String(p.longitude)) : 0,
      type: "photo" as const,
      content: p.photoUrl || "",
      createdAt: asDate(p.createdAt)?.toISOString() ?? new Date(0).toISOString(),
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const mapEvents = timelineEvents.filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng) && e.lat !== 0 && e.lng !== 0);

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
        <OrderLabelCard
          tone="done"
          orderNo={sessionData.workOrderId ? `#${sessionData.workOrderId}` : `#${sessionData.id}`}
          mode={sessionData.categoryName || "Brak kategorii"}
          machine={sessionData.resourceName || "—"}
          material={sessionData.materialName}
          quantity={sessionData.quantityTons ? `${sessionData.quantityTons}t` : null}
          customer={sessionData.customerLastName || null}
          description={sessionData.taskDescription}
          dateLabel={asDate(sessionData.startTime)?.toLocaleDateString("pl-PL") ?? "—"}
          timeLabel={`${asDate(sessionData.startTime)?.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) ?? "—"} – ${
            asDate(sessionData.endTime)?.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) ?? "—"
          }`}
        />
      </div>

      {!isStationary ? (
        <>
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3">Zapisana Trasa i Zdarzenia</h3>
          <div className="w-full h-64 md:h-96 relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-inner bg-zinc-100 dark:bg-zinc-900 mb-6">
            {pathTraveled.length > 0 || mapEvents.length > 0 ? (
              <MapWrapper
                currentLocation={currentLocation}
                pathTraveled={pathTraveled}
                destination={destination}
                events={mapEvents}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center flex-col gap-2 text-zinc-500">
                <MapPin className="w-8 h-8 opacity-50" />
                <span className="text-sm">Brak zapisanych danych GPS dla tego zlecenia.</span>
              </div>
            )}
          </div>
        </>
      ) : null}

      {(notes.length > 0 || photos.length > 0) && (
        <>
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-3 mt-8">Oś Czasu (Notatki i Zdjęcia)</h3>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 flex flex-col gap-4 shadow-sm">
            {timelineEvents.map((item, index) => (
              <div key={item.id} className="flex gap-3 relative">
                {index < timelineEvents.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-[-16px] w-[2px] bg-zinc-200 dark:bg-zinc-700"></div>
                )}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${item.type === 'photo' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                  {item.type === 'photo' ? <Camera className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="text-[10px] text-zinc-400 mb-1">{new Date(item.createdAt).toLocaleString('pl-PL')}</div>
                  {item.type === 'photo' ? (
                    <div className="w-24 h-24 rounded overflow-hidden border border-zinc-200 dark:border-zinc-700 mt-1">
                      <Image src={item.content} alt="Zdarzenie" width={96} height={96} unoptimized className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-700 dark:text-zinc-300 break-words bg-zinc-50 dark:bg-zinc-800 p-2 rounded mt-1">{item.content}</div>
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
