import { ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import { TimelineItem } from "@/types/worker";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { JWT_SECRET } from '@/lib/auth';
import { notFound } from "next/navigation";
import MapWrapper from "./MapWrapper";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { TimelineGalleryClient } from "./TimelineGalleryClient";

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
        <TimelineGalleryClient
          entries={timelineEvents.map((e) => ({
            id: e.id,
            type: e.type,
            createdAt: e.createdAt,
            content: e.content,
          }))}
        />
      )}
    </div>
  );
}
