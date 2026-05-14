import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { OrderLabelCard } from "@/components/work-orders/OrderLabelCard";
import { getDictionary, formatUiDateOnly, formatUiTimeHm } from "@/i18n";

import { JWT_SECRET } from "@/lib/auth";

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

export default async function HistoryPage() {
  const dict = getDictionary();
  const h = dict.worker.history;
  const workerClient = dict.worker.client;

  const userId = await getUserId();
  if (!userId) return <div>{h.accessDenied}</div>;

  const { WorkerSessionService } = await import("@/services/WorkerSessionService");
  const sessions = await WorkerSessionService.getCompletedSessions(userId);

  return (
    <div className="py-6 pb-20">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">{h.listTitle}</h1>

      {sessions.length === 0 ? (
         <div className="text-center p-8 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg">
           <p className="text-zinc-500 text-sm">{h.listEmpty}</p>
         </div>
      ) : (
         <div className="space-y-4">
           {sessions.map((s) => {
             const endD = asDate(s.endTime);
             const st = asDate(s.startTime);
             const en = asDate(s.endTime);
             return (
              <Link href={`/worker/history/${s.id}`} key={s.id} className="block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 hover:border-emerald-500 transition-colors cursor-pointer group shadow-sm hover:shadow-md">
                 <div className="flex items-center gap-2 mb-3">
                   <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                   <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                     {h.sessionCompletedBadge}
                   </span>
                   <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-auto group-hover:text-emerald-600 transition-colors">
                     {endD ? formatUiDateOnly(endD) : ""}
                   </span>
                 </div>
                 <OrderLabelCard
                   tone="done"
                   orderNo={s.workOrderId ? `#${s.workOrderId}` : `#${s.id}`}
                   mode={s.categoryName || workerClient.noCategoryName}
                   machine={s.resourceName || "—"}
                   material={s.materialName}
                   quantity={s.quantityTons ? `${s.quantityTons}t` : null}
                   customer={s.customerLastName || null}
                   description={s.taskDescription}
                   dateLabel={st ? formatUiDateOnly(st) : "—"}
                   timeLabel={`${st ? formatUiTimeHm(st) : "—"} – ${en ? formatUiTimeHm(en) : "—"}`}
                   className="mt-2"
                   attachmentPhotos={Boolean(s.hasPhotos)}
                   attachmentNotes={Boolean(s.hasNotes)}
                 />
              </Link>
             );
           })}
         </div>
      )}
    </div>
  );
}



